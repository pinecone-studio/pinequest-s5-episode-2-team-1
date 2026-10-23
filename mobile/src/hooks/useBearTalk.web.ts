import type { Subject, TutorClientMsg, TutorServerMsg } from '@shared/types';
import { useEffect, useRef, useState } from 'react';
import { openTutorSocket } from '@/api/client';
import { S } from '@/i18n/strings';
import { MOUTH_STEP, type MouthLevel, mouthLevels } from '@/lib/mouth';
import type { TalkPhase } from './useBearTalk';

/**
 * Browser-ийн хувилбар (Metro `.web.ts`-ийг сонгоно): expo-audio-ийн useAudioStream, expo-file-system web-д
 * ажилладаггүй тул Web Audio-гоор. Mic: getUserMedia → AudioWorklet → 16 kHz PCM16. Баавгай: 24 kHz PCM-ийг
 * AudioBuffer болгож тасралтгүй дараалуулна. Ээлжлэх логик нь утасныхтай ижил (useBearTalk.ts).
 */
const MIC_RATE = 16_000;
const BEAR_RATE = 24_000;
/** Хуудсыг шууд хаягаар нээсэн, refresh хийсэн үед browser AudioContext-ийг хүүхэд дартал асаадаггүй: resume() дуусахгүй. */
const RESUME_MS = 1_500;
/** Mic зөвшөөрөгдсөнөөс хойш баавгай бэлэн болох хугацаа: хэтэрвэл үүрд эргэлдэхийн оронд алдаа харуулна. */
const READY_MS = 20_000;

const within = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);

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
  /** Баавгайн ам: тоглож буй хэсгийн тэр агшны чанга байдал */
  const [mouth, setMouth] = useState<MouthLevel>(0);
  const interruptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    let closedByUs = false;
    let ws: WebSocket | null = null;
    let mic = false;
    let media: MediaStream | null = null;
    let micCtx: AudioContext | null = null;
    let outCtx: AudioContext | null = null;
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

    const end = (message: string) => {
      if (!alive) return;
      clearTimeout(stall);
      setNotice(message);
      setPhase('ended');
      mic = false;
      silence();
      // Browser-ийн mic-ийн тэмдэг асаалттай үлдэхгүйн тулд.
      media?.getTracks().forEach((t) => t.stop());
      closedByUs = true;
      ws?.close();
    };

    const micOn = () => {
      if (!alive || mic) return;
      setKidText('');
      setPhase('listening');
      mic = true;
    };

    const onDrained = () => {
      if (turnDone && sources.size === 0) micOn();
    };

    const onAudio = (buf: ArrayBuffer) => {
      if (!alive || drop || !outCtx) return;
      turnDone = false;
      if (mic) {
        mic = false;
        send({ type: 'mic_off' });
      }
      setPhase('bear');
      const pcm = new Int16Array(buf, 0, buf.byteLength >> 1);
      const samples = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 0x8000;
      const audio = outCtx.createBuffer(1, samples.length, BEAR_RATE);
      audio.copyToChannel(samples, 0);
      const src = outCtx.createBufferSource();
      src.buffer = audio;
      src.connect(outCtx.destination);
      // Бага зэрэг урьдчилж байрлуулбал сүлжээний хэлбэлзэлд тасрахгүй.
      const at = Math.max(outCtx.currentTime + 0.08, nextAt);
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
          micOn();
          break;
        case 'end':
          end(m.reason === 'time' ? S.tutor.timeUp : (m.message ?? S.tutor.lost));
          break;
      }
    };

    interruptRef.current = () => {
      if (!alive) return;
      silence();
      drop = !turnDone;
      turnDone = true;
      freshTurn = true;
      micOn();
    };

    void (async () => {
      try {
        media = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
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
      const tap = new AudioWorkletNode(micCtx, 'bear-mic-tap');
      tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (!mic) {
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
            if (ws?.readyState === WebSocket.OPEN) ws.send(toPcm16(pending, inputRate));
            pending = new Float32Array(batch);
            filled = 0;
          }
        }
      };
      // Worklet-ийг ажиллуулахын тулд graph-д холбоно; дууг нь чанга яригч руу гаргахгүй (gain 0).
      const mute = micCtx.createGain();
      mute.gain.value = 0;
      micCtx.createMediaStreamSource(media).connect(tap).connect(mute).connect(micCtx.destination);

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
      mic = false;
      interruptRef.current = null;
      silence();
      ws?.close();
      media?.getTracks().forEach((t) => t.stop());
      void micCtx?.close().catch(() => {});
      void outCtx?.close().catch(() => {});
    };
  }, [questionId, attempt]);

  return {
    phase,
    mouth,
    bearText,
    kidText,
    topic,
    notice,
    interrupt: () => interruptRef.current?.(),
    restart: () => setAttempt((n) => n + 1),
  };
}
