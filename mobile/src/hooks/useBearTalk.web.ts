import type { Subject, TutorClientMsg, TutorServerMsg } from '@shared/types';
import { useEffect, useRef, useState } from 'react';
import { openTutorSocket } from '@/api/client';
import { curtainOpenAt } from '@/components/LeafCurtain';
import { S } from '@/i18n/strings';
import { MOUTH_STEP, type MouthLevel, mouthLevels } from '@/lib/mouth';
import { HOLD_MIN_MS, REPLY_MS } from './talkTiming';
import type { TalkPhase } from './useBearTalk';

/**
 * Browser-ийн хувилбар (Metro `.web.ts`-ийг сонгоно): expo-audio-ийн useAudioStream, expo-file-system web-д
 * ажилладаггүй тул Web Audio-гоор. Mic: getUserMedia → AudioWorklet → 16 kHz PCM16. Баавгай: 24 kHz PCM-ийг
 * AudioBuffer болгож тасралтгүй дараалуулна. Ээлжлэх логик нь утасныхтай ижил (useBearTalk.ts).
 *
 * Mic нээлттэй байх хооронд утас (iPhone Safari, Android Chrome) дууг "дуудлагын" горимоор, чанга яригчийг
 * намсгаж тоглуулдаг: баавгай маш сул сонсогддог байсан. Тиймээс mic-ийг зөвхөн хүүхдийн ээлжид нээж, баавгай
 * ярихад бүрэн хаана (getUserMedia-ийн track-уудыг зогсооно).
 */
const MIC_RATE = 16_000;
const BEAR_RATE = 24_000;
/** Хуудсыг шууд хаягаар нээсэн, refresh хийсэн үед browser AudioContext-ийг хүүхэд дартал асаадаггүй: resume() дуусахгүй. */
const RESUME_MS = 1_500;
/** Mic зөвшөөрөгдсөнөөс хойш баавгай бэлэн болох хугацаа: хэтэрвэл үүрд эргэлдэхийн оронд алдаа харуулна. */
const READY_MS = 20_000;

const within = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);

// Echo cancellation асаалттай бол iPhone (Safari) mic нээлттэй байх хугацаанд бусад дууг намсгадаг. Баавгай ярьж
// байхад mic хаалттай тул (ээлжилнэ) цуурай Gemini-д хүрэхгүй.
const MIC: MediaStreamConstraints = { audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true } };

// Mic-ийн дууг 128 frame тутам main thread руу дамжуулна.
const TAP_WORKLET = `class Tap extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor('bear-mic-tap', Tap);`;

/** Float32 [-1, 1] → PCM16LE, дундажлан 16 kHz болгож бууруулна (batch нь inputRate/10 тул яг 1600 sample гарна). */
function toPcm16(input: Float32Array, inputRate: number): ArrayBuffer {
  const ratio = inputRate / MIC_RATE;
  const out = new Int16Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const from = Math.floor(i * ratio);
    const to = Math.max(from + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = from; j < to; j++) sum += input[j];
    const v = Math.max(-1, Math.min(1, sum / (to - from)));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out.buffer;
}

export function useBearTalk(questionId: number | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<TalkPhase>('connecting');
  const [bearText, setBearText] = useState('');
  const [kidText, setKidText] = useState('');
  const [topic, setTopic] = useState<{ subject: Subject; prompt: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Gemini бэлэн: хөшиг нээгдэж эхэлнэ (баавгай нээгдэж дууссаны дараа ярина) */
  const [ready, setReady] = useState(false);
  /** Баавгайн ам: тоглож буй хэсгийн тэр агшны чанга байдал */
  const [mouth, setMouth] = useState<MouthLevel>(0);
  /** Товчийг хэт богино дарсан: "дарсаар байгаад ярь" гэж сануулна. */
  const [hint, setHint] = useState(false);
  const interruptRef = useRef<(() => void) | null>(null);
  const holdRef = useRef<{ start: () => void; end: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    const shutAt = Date.now();
    /** баавгайн дуу эхлэх хамгийн эрт агшин: хөшиг бүрэн нээгдсэн үе */
    let openAt = 0;
    let closedByUs = false;
    let ws: WebSocket | null = null;
    /** mic-ийн дууг илгээж байна / хүүхдийн ээлж (mic нээгдэж байгаа ч байж болно) */
    let mic = false;
    let wantMic = false;
    /**
     * Push-to-talk: 'pending' = товч дарсан ч HOLD_MIN_MS болоогүй (дууг early-д хадгална), 'on' = серверт илгээж байна.
     * Товч дараагүй үед mic нээлттэй ч дуу явахгүй: гадны чимээг баавгай сонсохгүй.
     */
    let talk: 'idle' | 'pending' | 'on' = 'idle';
    let early: ArrayBuffer[] = [];
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let replyTimer: ReturnType<typeof setTimeout> | undefined;
    let media: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let tap: AudioWorkletNode | null = null;
    let opening: Promise<boolean> | null = null;
    let micCtx: AudioContext | null = null;
    let outCtx: AudioContext | null = null;
    /** баавгайн дуу энд холбогдоно (compressor → чанга яригч) */
    let speaker: AudioNode | null = null;
    let nextAt = 0;
    let stall: ReturnType<typeof setTimeout> | undefined;
    const sources = new Set<AudioBufferSourceNode>();
    let turnDone = false;
    let freshTurn = true;
    let drop = false;
    /** дараалсан хэсэг бүрийн эхлэх агшин (outCtx-ийн цаг) ба MOUTH_STEP тутмын амны нээлт */
    let lipTrack: { at: number; levels: MouthLevel[] }[] = [];
    const lips = setInterval(() => {
      const t = outCtx?.currentTime ?? 0;
      lipTrack = lipTrack.filter((s) => s.at + s.levels.length * MOUTH_STEP > t);
      const s = lipTrack.find((x) => x.at <= t);
      setMouth(s ? (s.levels[Math.floor((t - s.at) / MOUTH_STEP)] ?? 0) : 0);
    }, MOUTH_STEP * 1000);

    setPhase('connecting');
    setBearText('');
    setKidText('');
    setTopic(null);
    setNotice(null);
    setReady(false);
    setHint(false);

    const send = (msg: TutorClientMsg) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    const silence = () => {
      for (const s of sources) {
        s.onended = null;
        try {
          s.stop();
        } catch {
          // эхлээгүй/дууссан
        }
      }
      sources.clear();
      nextAt = 0;
      lipTrack = [];
    };

    /** Mic-ийг бүрэн хаана: утас дууг энгийн (чанга) горимоор тоглуулна, browser-ийн mic-ийн тэмдэг унтарна. */
    const releaseMic = () => {
      source?.disconnect();
      source = null;
      media?.getTracks().forEach((t) => t.stop());
      media = null;
    };

    /** Mic-ийг нээж worklet-д холбоно. Зөвшөөрлийг эхэнд авсан тул дахин асуухгүй. */
    const openMic = () =>
      (opening ??= (async () => {
        try {
          if (!media) media = await navigator.mediaDevices.getUserMedia(MIC);
          if (!alive || !micCtx || !tap) return false;
          if (!source) {
            source = micCtx.createMediaStreamSource(media);
            source.connect(tap);
          }
          // Утас дууны горимоо солиход context түр зогсож болно.
          if (micCtx.state !== 'running') await micCtx.resume();
          return true;
        } catch {
          return false;
        } finally {
          opening = null;
        }
      })());

    const micOff = () => {
      wantMic = false;
      mic = false;
      talk = 'idle';
      early = [];
      clearTimeout(holdTimer);
      releaseMic();
    };

    const end = (message: string) => {
      if (!alive) return;
      clearTimeout(stall);
      clearTimeout(replyTimer);
      setNotice(message);
      setPhase('ended');
      micOff();
      silence();
      closedByUs = true;
      ws?.close();
    };

    const micOn = async () => {
      if (!alive || wantMic) return;
      clearTimeout(replyTimer);
      wantMic = true;
      const ok = await openMic();
      // Хүлээх хооронд баавгай дахин ярьж эхэлсэн эсвэл дэлгэц хаагдсан.
      if (!alive || !wantMic) {
        if (!wantMic) releaseMic();
        return;
      }
      if (!ok) {
        end(S.tutor.micFailed);
        return;
      }
      mic = true;
      setPhase('listening');
    };

    const onDrained = () => {
      if (turnDone && sources.size === 0) void micOn();
    };

    const onAudio = (buf: ArrayBuffer) => {
      if (!alive || drop || !outCtx || !speaker) return;
      turnDone = false;
      clearTimeout(replyTimer);
      if (wantMic) micOff();
      if (outCtx.state !== 'running') void outCtx.resume().catch(() => {});
      setPhase('bear');
      const pcm = new Int16Array(buf, 0, buf.byteLength >> 1);
      const samples = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 0x8000;
      const audio = outCtx.createBuffer(1, samples.length, BEAR_RATE);
      audio.copyToChannel(samples, 0);
      const src = outCtx.createBufferSource();
      src.buffer = audio;
      src.connect(speaker);
      // Бага зэрэг урьдчилж байрлуулбал сүлжээний хэлбэлзэлд тасрахгүй. Эхний дуу хөшиг нээгдэж дуусахыг хүлээнэ.
      const at = Math.max(outCtx.currentTime + 0.08, nextAt, outCtx.currentTime + (openAt - Date.now()) / 1000);
      src.start(at);
      nextAt = at + audio.duration;
      lipTrack.push({ at, levels: mouthLevels(pcm, BEAR_RATE) });
      sources.add(src);
      src.onended = () => {
        sources.delete(src);
        onDrained();
      };
    };

    const onMessage = (m: TutorServerMsg) => {
      switch (m.type) {
        case 'ready':
          clearTimeout(stall);
          setTopic(m.topic);
          openAt = curtainOpenAt(shutAt);
          setReady(true);
          break;
        case 'bear_text': {
          if (drop) break;
          const fresh = freshTurn;
          freshTurn = false;
          setBearText((t) => (fresh ? m.text : t + m.text));
          break;
        }
        case 'kid_text':
          setKidText((t) => t + m.text);
          break;
        case 'turn_end':
          freshTurn = true;
          if (drop) {
            drop = false;
            break;
          }
          turnDone = true;
          onDrained();
          break;
        case 'interrupted':
          drop = false;
          freshTurn = true;
          turnDone = true;
          silence();
          void micOn();
          break;
        case 'end':
          end(m.reason === 'time' ? S.tutor.timeUp : m.reason === 'done' ? S.tutor.done : (m.message ?? S.tutor.lost));
          break;
      }
    };

    interruptRef.current = () => {
      if (!alive) return;
      silence();
      // Сервер энэ ээлжийн үлдсэн яриаг үүсгэхээ болино (TTS-ийн зардал, баавгайн хугацаа).
      if (!turnDone) send({ type: 'interrupt' });
      drop = !turnDone;
      turnDone = true;
      freshTurn = true;
      void micOn();
    };

    holdRef.current = {
      // Дарсан: HOLD_MIN_MS дарсаар байвал л серверт "ярьж эхэллээ" гэж, хадгалсан дуутай нь илгээнэ.
      start: () => {
        if (!alive || !mic || talk !== 'idle') return;
        talk = 'pending';
        early = [];
        setHint(false);
        setKidText('');
        setPhase('talking');
        holdTimer = setTimeout(() => {
          if (talk !== 'pending') return;
          talk = 'on';
          send({ type: 'talk_start' });
          if (ws?.readyState === WebSocket.OPEN) for (const b of early) ws.send(b);
          early = [];
        }, HOLD_MIN_MS);
      },
      // Сулласан: баавгай хариулна (mic хаагдаж, дуу чанга тоглоно). Хэт богино бол юу ч илгээхгүй.
      end: () => {
        if (!alive || talk === 'idle') return;
        clearTimeout(holdTimer);
        if (talk === 'pending') {
          talk = 'idle';
          early = [];
          setHint(true);
          setPhase('listening');
          return;
        }
        send({ type: 'talk_end' });
        micOff();
        setPhase('thinking');
        replyTimer = setTimeout(() => void micOn(), REPLY_MS);
      },
    };

    void (async () => {
      try {
        // Зөвшөөрлийг эхэнд авна; mic-ийг баавгай мэндэлж дууссаны дараа л дахин нээнэ.
        media = await navigator.mediaDevices.getUserMedia(MIC);
      } catch {
        end(S.tutor.micDenied);
        return;
      }
      if (!alive) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stall = setTimeout(() => end(S.tutor.stalled), READY_MS);
      try {
        outCtx = new AudioContext();
        micCtx = new AudioContext();
        if (!(await within(Promise.all([outCtx.resume(), micCtx.resume()]), RESUME_MS))) {
          // Дарахыг хүлээнэ: mic-ийг унтрааж, дарахад restart шинэ AudioContext үүсгэнэ (дараа нь зөвшөөрөгдсөн).
          clearTimeout(stall);
          media.getTracks().forEach((t) => t.stop());
          if (alive) setPhase('tap');
          return;
        }
        const url = URL.createObjectURL(new Blob([TAP_WORKLET], { type: 'application/javascript' }));
        await micCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
      } catch {
        end(S.tutor.micFailed);
        return;
      }
      if (!alive) return;
      const inputRate = micCtx.sampleRate;
      const batch = Math.round(inputRate / 10);
      let pending = new Float32Array(batch);
      let filled = 0;
      tap = new AudioWorkletNode(micCtx, 'bear-mic-tap');
      tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (!mic || talk === 'idle') {
          filled = 0;
          return;
        }
        let chunk = e.data;
        while (chunk.length > 0) {
          const n = Math.min(chunk.length, batch - filled);
          pending.set(chunk.subarray(0, n), filled);
          filled += n;
          chunk = chunk.subarray(n);
          if (filled === batch) {
            const pcm = toPcm16(pending, inputRate);
            if (talk === 'pending') early.push(pcm);
            else if (ws?.readyState === WebSocket.OPEN) ws.send(pcm);
            pending = new Float32Array(batch);
            filled = 0;
          }
        }
      };
      // Worklet-ийг ажиллуулахын тулд graph-д холбоно; дууг нь чанга яригч руу гаргахгүй (gain 0). Mic-ийн
      // source-ийг хүүхдийн ээлж бүрт openMic холбоно.
      const mute = micCtx.createGain();
      mute.gain.value = 0;
      tap.connect(mute).connect(micCtx.destination);
      // Зөвшөөрөл авагдсан: баавгай мэндэлж байх хооронд mic хаалттай байна.
      releaseMic();

      // Compressor оргилуудыг дарж, gain нийт чанга байдлыг нэмнэ: баавгайн TTS дуун дээр хэмжихэд ~+3 dB, тасралтгүй
      // (оргил −0.4 dB).
      const comp = outCtx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      const boost = outCtx.createGain();
      boost.gain.value = 1.35;
      comp.connect(boost).connect(outCtx.destination);
      speaker = comp;

      const sock = openTutorSocket(questionId);
      sock.binaryType = 'arraybuffer';
      ws = sock;
      sock.onmessage = (e) => {
        if (typeof e.data !== 'string') {
          onAudio(e.data as ArrayBuffer);
          return;
        }
        try {
          onMessage(JSON.parse(e.data) as TutorServerMsg);
        } catch {
          // буруу мессеж
        }
      };
      sock.onclose = () => {
        if (!closedByUs) end(S.tutor.lost);
      };
    })();

    return () => {
      alive = false;
      closedByUs = true;
      clearInterval(lips);
      clearTimeout(stall);
      clearTimeout(replyTimer);
      interruptRef.current = null;
      holdRef.current = null;
      micOff();
      silence();
      ws?.close();
      void micCtx?.close().catch(() => {});
      void outCtx?.close().catch(() => {});
    };
  }, [questionId, attempt]);

  return {
    phase,
    ready,
    mouth,
    bearText,
    kidText,
    topic,
    notice,
    hint,
    interrupt: () => interruptRef.current?.(),
    /** Хүүхэд товч дарж ярина: дарахад эхэлж, суллахад баавгай хариулна. */
    holdStart: () => holdRef.current?.start(),
    holdEnd: () => holdRef.current?.end(),
    restart: () => setAttempt((n) => n + 1),
  };
}
