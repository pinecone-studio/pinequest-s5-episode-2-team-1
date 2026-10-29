import type { Subject, TutorClientMsg, TutorServerMsg } from '@shared/types';
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioStream } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { openTutorSocket } from '@/api/client';
import { curtainOpenAt } from '@/components/LeafCurtain';
import { S } from '@/i18n/strings';
import { MOUTH_STEP, type MouthLevel, mouthLevels } from '@/lib/mouth';
import { pcmToWav } from '@/lib/wav';
import { HOLD_MIN_MS, REPLY_MS } from './talkTiming';

/** Сервер mic-ийн дууг 16 kHz гэж Gemini-д дамжуулна; баавгайн дуу 24 kHz ирнэ (shared/types TutorServerMsg). */
const MIC_RATE = 16_000;
const BEAR_RATE = 24_000;
/** Баавгайн дуу ийм хэмжээтэй (0.25 сек) хуримтлагдмагц тоглуулж эхэлнэ: бага бол хурдан эхлэх ч хэсэг олон болно. */
const START_BYTES = BEAR_RATE * 2 * 0.25;
/**
 * iOS-д mic-ийн stream (.record) ба тоглуулалт зэрэг ажиллахгүй, чанга яригчаас echo ч гарна. Тиймээс ээлжлэн:
 * баавгай ярихад mic унтарч энэ горимд шилжинэ, баавгай дуусмагц mic дахин асна.
 */
const PLAYBACK_MODE = { playsInSilentMode: true, allowsRecording: false, interruptionMode: 'doNotMix' } as const;

/**
 * 'tap': browser хүүхдийн даралтгүйгээр дуу асаахыг зөвшөөрсөнгүй (зөвхөн web); дарвал restart-аар дахин эхэлнэ.
 * 'listening': хүүхдийн ээлж, товч дарж ярина; 'talking': товч дарсаар ярьж байна; 'thinking': суллалаа, баавгай
 * хариугаа бэлдэж байна.
 */
export type TalkPhase = 'connecting' | 'tap' | 'bear' | 'listening' | 'talking' | 'thinking' | 'ended';

/**
 * Баавгайтай дуугаар ярилцах (GET /tutor/ws). Баавгайн дууг хэсэг хэсгээр нь WAV болгож дараалан тоглуулна:
 * нэг хэсэг дуусахад тэр хооронд ирсэн бүх дууг дараагийн хэсэг болгоно.
 */
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

  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef(false);
  /** Push-to-talk (useBearTalk.web.ts-тэй ижил): 'pending' үеийн дууг earlyRef-д хадгална. */
  const talkRef = useRef<'idle' | 'pending' | 'on'>('idle');
  const earlyRef = useRef<ArrayBuffer[]>([]);
  const interruptRef = useRef<(() => void) | null>(null);
  const holdRef = useRef<{ start: () => void; end: () => void } | null>(null);

  // Хэсэг дууссаныг (didJustFinish) хурдан мэдэж дараагийнхыг тоглуулахын тулд status-ыг ойр ойрхон авна.
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const { stream } = useAudioStream({
    sampleRate: MIC_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: (b) => {
      const ws = wsRef.current;
      if (!micRef.current || talkRef.current === 'idle') return;
      if (talkRef.current === 'pending') earlyRef.current.push(b.data);
      else if (ws?.readyState === WebSocket.OPEN) ws.send(b.data);
    },
  });

  useEffect(() => {
    let alive = true;
    const shutAt = Date.now();
    /** баавгайн дуу эхлэх хамгийн эрт агшин: хөшиг бүрэн нээгдсэн үе */
    let openAt = 0;
    let closedByUs = false;
    let ws: WebSocket | null = null;
    let pcm: Uint8Array[] = [];
    let pcmBytes = 0;
    let playing = false;
    /** Одоогийн ээлжийн бүх дуу серверээс ирсэн. */
    let turnDone = false;
    /** Дараагийн bear_text шинэ ээлжийнх. */
    let freshTurn = true;
    /** Хүүхэд баавгайг тасалсан: энэ ээлжийн үлдсэн дууг хаяна. */
    let drop = false;
    let mode: Promise<unknown> = Promise.resolve();
    let seg = 0;
    const files: File[] = [];
    /** тоглож буй хэсгийн MOUTH_STEP тутмын амны нээлт */
    let levels: MouthLevel[] = [];
    const lips = setInterval(() => {
      setMouth(playing ? (levels[Math.floor(player.currentTime / MOUTH_STEP)] ?? 0) : 0);
    }, MOUTH_STEP * 1000);

    setPhase('connecting');
    setBearText('');
    setKidText('');
    setTopic(null);
    setNotice(null);
    setReady(false);

    const send = (msg: TutorClientMsg) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let replyTimer: ReturnType<typeof setTimeout> | undefined;
    setHint(false);

    const stopMic = () => {
      talkRef.current = 'idle';
      earlyRef.current = [];
      clearTimeout(holdTimer);
      if (!micRef.current) return;
      micRef.current = false;
      try {
        stream.stop();
      } catch {
        // аль хэдийн зогссон
      }
    };

    const end = (message: string) => {
      if (!alive) return;
      setNotice(message);
      setPhase('ended');
      stopMic();
      player.pause();
      pcm = [];
      pcmBytes = 0;
      closedByUs = true;
      ws?.close();
    };

    const micOn = async () => {
      if (!alive || micRef.current) return;
      clearTimeout(replyTimer);
      setPhase('listening');
      micRef.current = true;
      try {
        await stream.start();
      } catch {
        end(S.tutor.micFailed);
      }
    };

    const playNext = async () => {
      if (!alive || playing || pcmBytes === 0) return;
      playing = true;
      await mode;
      // Эхний хэсэг хөшиг нээгдэж дуусахыг хүлээнэ; хооронд ирсэн дуу энэ хэсэгт нэмэгдэнэ.
      const wait = openAt - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (!alive) return;
      // Хүлээх хооронд хүүхэд баавгайг тасалсан бол (pcm хоосорсон) хоосон WAV тоглуулахгүй.
      if (pcmBytes === 0) {
        playing = false;
        return;
      }
      const chunks = pcm;
      pcm = [];
      pcmBytes = 0;
      const file = new File(Paths.cache, `bear-${Date.now()}-${seg++}.wav`);
      const wav = pcmToWav(chunks, BEAR_RATE);
      try {
        file.write(wav);
      } catch {
        playing = false;
        return;
      }
      levels = mouthLevels(new Int16Array(wav.buffer, 44, (wav.byteLength - 44) >> 1), BEAR_RATE);
      files.push(file);
      player.replace({ uri: file.uri });
      player.play();
    };

    const onSegmentEnd = () => {
      playing = false;
      for (const f of files.splice(0)) {
        try {
          f.delete();
        } catch {
          // устгаж чадаагүй ч cache тул хамаагүй
        }
      }
      if (pcmBytes > 0) void playNext();
      else if (turnDone) void micOn();
    };

    const onAudio = (buf: ArrayBuffer) => {
      if (!alive || drop) return;
      turnDone = false;
      clearTimeout(replyTimer);
      if (micRef.current) {
        stopMic();
        send({ type: 'mic_off' });
        mode = setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      }
      setPhase('bear');
      pcm.push(new Uint8Array(buf));
      pcmBytes += buf.byteLength;
      if (!playing && pcmBytes >= START_BYTES) void playNext();
    };

    const onMessage = (m: TutorServerMsg) => {
      switch (m.type) {
        case 'ready':
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
          if (!playing) {
            if (pcmBytes > 0) void playNext();
            else void micOn();
          }
          break;
        case 'interrupted':
          drop = false;
          freshTurn = true;
          turnDone = true;
          pcm = [];
          pcmBytes = 0;
          playing = false;
          player.pause();
          void micOn();
          break;
        case 'end':
          end(m.reason === 'time' ? S.tutor.timeUp : m.reason === 'done' ? S.tutor.done : (m.message ?? S.tutor.lost));
          break;
      }
    };

    interruptRef.current = () => {
      if (!alive) return;
      player.pause();
      pcm = [];
      pcmBytes = 0;
      playing = false;
      // Сервер энэ ээлжийн үлдсэн яриаг үүсгэхээ болино (TTS-ийн зардал, баавгайн хугацаа).
      if (!turnDone) send({ type: 'interrupt' });
      drop = !turnDone;
      turnDone = true;
      freshTurn = true;
      void micOn();
    };

    holdRef.current = {
      start: () => {
        if (!alive || !micRef.current || talkRef.current !== 'idle') return;
        talkRef.current = 'pending';
        earlyRef.current = [];
        setHint(false);
        setKidText('');
        setPhase('talking');
        holdTimer = setTimeout(() => {
          if (talkRef.current !== 'pending') return;
          talkRef.current = 'on';
          send({ type: 'talk_start' });
          if (ws?.readyState === WebSocket.OPEN) for (const b of earlyRef.current) ws.send(b);
          earlyRef.current = [];
        }, HOLD_MIN_MS);
      },
      end: () => {
        if (!alive || talkRef.current === 'idle') return;
        clearTimeout(holdTimer);
        if (talkRef.current === 'pending') {
          talkRef.current = 'idle';
          earlyRef.current = [];
          setHint(true);
          setPhase('listening');
          return;
        }
        send({ type: 'talk_end' });
        stopMic();
        setPhase('thinking');
        replyTimer = setTimeout(() => void micOn(), REPLY_MS);
      },
    };

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) onSegmentEnd();
    });

    void (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!alive) return;
      if (!perm.granted) {
        end(S.tutor.micDenied);
        return;
      }
      mode = setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      const sock = openTutorSocket(questionId);
      sock.binaryType = 'arraybuffer';
      ws = sock;
      wsRef.current = sock;
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
      clearTimeout(replyTimer);
      interruptRef.current = null;
      holdRef.current = null;
      sub.remove();
      stopMic();
      try {
        player.pause();
      } catch {
        // player аль хэдийн чөлөөлөгдсөн
      }
      ws?.close();
      wsRef.current = null;
      for (const f of files) {
        try {
          f.delete();
        } catch {
          // cache
        }
      }
      void setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
    };
  }, [questionId, attempt, player, stream]);

  return {
    phase,
    ready,
    mouth,
    bearText,
    kidText,
    topic,
    notice,
    hint,
    /** Баавгай ярьж байхад: зогсоогоод хүүхдийн mic-ийг асаана. */
    interrupt: () => interruptRef.current?.(),
    /** Хүүхэд товч дарж ярина: дарахад эхэлж, суллахад баавгай хариулна. */
    holdStart: () => holdRef.current?.start(),
    holdEnd: () => holdRef.current?.end(),
    restart: () => setAttempt((n) => n + 1),
  };
}
