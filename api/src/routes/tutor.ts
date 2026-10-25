import { Hono } from 'hono';
import type { TutorClientMsg, TutorServerMsg } from '../../../shared/types';
import { GAME } from '../config/game';
import type { AppEnv } from '../env';
import { fromB64, toB64 } from '../lib/auth';
import { ApiError, parseId } from '../lib/errors';
import { socketUserId } from '../lib/session';
import {
  isQuotaClose,
  LIVE_AUDIO_END,
  LIVE_URL,
  liveAudio,
  liveEvents,
  liveSetup,
  liveText,
  speechBudget,
  TUTOR_WRAP_UP,
  tutorKickoff,
  tutorSystemPrompt,
} from '../llm/live';
import { SpeechQueue, speechChunkEnd } from '../llm/speech';
import { cleanForSpeech, speechMode, ttsAvailable, ttsStream } from '../llm/tts';
import { endTutorSession, loadTutorContext, startTutorSession } from '../services/tutor';

export const tutorRoutes = new Hono<AppEnv>();

/**
 * Баавгайтай дуугаар ярилцах: утас ↔ энэ Worker ↔ Gemini Live. GEMINI_API_KEY болон system prompt (хүүхдийн
 * алдсан бодлого) серверээс гарахгүй; клиент зөвхөн mic-ийн PCM илгээж, баавгайн PCM-ийг хүлээн авна.
 * `?questionId=` өгвөл тэр бодлогын тухай, үгүй бол сүүлд алдсан хэдэн бодлогын тухай ярина.
 */
tutorRoutes.get('/ws', async (c) => {
  const userId = await socketUserId(c);
  const key = c.env.GEMINI_API_KEY ?? '';
  const raw = c.req.query('questionId');
  const questionId = raw === undefined ? undefined : parseId(raw);

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  // compatibility_date-аас хамаарч binary нь Blob ирдэг тул ArrayBuffer болгоно (дуу дараалал алдагдахгүй, sync).
  server.binaryType = 'arraybuffer';
  // Upgrade-ийн дараах алдааг (бодлого олдсонгүй, Gemini татгалзсан) клиент socket-оор уншиж харуулна.
  c.executionCtx.waitUntil(
    relay(server, {
      key,
      model: c.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live',
      // TTS-ийн өдрийн квот дууссан бол (ttsAvailable) шууд Live-ийн дуугаар ярина.
      ttsModel: speechMode(c.env.TUTOR_SPEECH) === 'tts' && ttsAvailable() ? c.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts' : null,
      // Live-ийг үнэгүй багцын түлхүүрээр, TTS-ийг (үнэгүй багцад өдөрт 10 хүсэлт) billing-тэй түлхүүрээр ажиллуулж болно.
      ttsKey: c.env.GEMINI_TTS_API_KEY || key,
      session: {
        start: () => startTutorSession(c.env.DB, userId),
        end: (id, counted, bearMs) =>
          c.executionCtx.waitUntil(endTutorSession(c.env.DB, id, counted, bearMs).catch((e) => console.error('[tutor] session', e))),
      },
      load: async () => {
        // Upgrade-ийн өмнө HTTP 503 өгвөл клиент зөвхөн "холбоо тасарлаа" л хардаг тул socket-оор мэдэгдэнэ.
        if (!key) throw new ApiError(503, 'TUTOR_UNAVAILABLE', 'Баавгай одоо ярих боломжгүй байна. Дараа дахин оролдоно уу.');
        return loadTutorContext(c.env.DB, userId, questionId);
      },
    }),
  );
  return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'bearer' } });
});

async function connectLive(key: string): Promise<WebSocket> {
  const res = await fetch(LIVE_URL, { headers: { Upgrade: 'websocket', 'x-goog-api-key': key } });
  const ws = res.webSocket;
  if (!ws) throw new Error(`Gemini Live: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  ws.accept();
  ws.binaryType = 'arraybuffer';
  return ws;
}

function safeClose(ws: WebSocket, code = 1000, reason = 'closed') {
  try {
    ws.close(code, reason);
  } catch {
    // аль хэдийн хаагдсан
  }
}

async function relay(
  client: WebSocket,
  opts: {
    key: string;
    model: string;
    ttsModel: string | null;
    ttsKey: string;
    /** Хэрэглэгчийн өдрийн / зэрэг ярилцлагын хязгаар (services/tutor). */
    session: { start: () => Promise<number>; end: (id: number, counted: boolean, bearMs: number) => void };
    load: () => ReturnType<typeof loadTutorContext>;
  },
) {
  let closed = false;
  // Gemini-тэй холбогдох хооронд хүүхэд дэлгэцээ хааж болно: тэгвэл Live session нээлгүй орхино.
  let clientGone = false;
  const onEarlyClose = () => {
    clientGone = true;
  };
  client.addEventListener('close', onEarlyClose);
  const send = (msg: TutorServerMsg) => {
    try {
      client.send(JSON.stringify(msg));
    } catch {
      // клиент салсан
    }
  };

  let upstream: WebSocket;
  let ctx: Awaited<ReturnType<typeof loadTutorContext>>;
  let sessionId: number | null = null;
  try {
    ctx = await opts.load();
    if (clientGone) return;
    sessionId = await opts.session.start();
    if (clientGone) {
      opts.session.end(sessionId, false, 0);
      return;
    }
    upstream = await connectLive(opts.key);
    if (clientGone) {
      opts.session.end(sessionId, false, 0);
      safeClose(upstream);
      return;
    }
  } catch (e) {
    if (sessionId !== null) opts.session.end(sessionId, false, 0);
    if (!(e instanceof ApiError)) console.error('[tutor]', e);
    send({ type: 'end', reason: 'error', message: e instanceof ApiError ? e.message : 'Баавгайтай холбогдож чадсангүй' });
    safeClose(client, 1011, 'error');
    return;
  }

  /** Баавгайн ярьсан хугацаа (зардал) ба клиент дээр дуу нь тоглож дуусах агшин (ойролцоогоор). */
  let bearMs = 0;
  let playedUntil = 0;
  /** Дуусгах заавар (TUTOR_WRAP_UP) өгсөн; turnStartMs = энэ ээлж эхлэхэд bearMs. */
  let wrapping = false;
  let turnStartMs = 0;
  const sendAudio = (pcm: Uint8Array) => {
    const ms = pcm.byteLength / ((GAME.TUTOR.OUTPUT_RATE * 2) / 1000);
    bearMs += ms;
    playedUntil = Math.max(playedUntil, Date.now()) + ms;
    try {
      client.send(pcm);
    } catch {
      // клиент салсан
    }
    // Дуусгах ээлж ч хэт удаан бол хүлээхгүй.
    if (bearMs >= GAME.TUTOR.BEAR_SPEECH_MS + GAME.TUTOR.WRAP_UP_MS) shutdown({ type: 'end', reason: 'time' });
  };
  /** Баавгайн ээлж клиентэд дууссан: хугацаа нь дуусах гэж байвал дуусгах ээлж, дууссан бол баяртай гэснийх нь дараа хаана. */
  const bearTurnEnd = () => {
    send({ type: 'turn_end' });
    const next = speechBudget(bearMs, wrapping, bearMs > turnStartMs);
    turnStartMs = bearMs;
    if (next === 'wrap') {
      wrapping = true;
      sendUp(liveText(TUTOR_WRAP_UP, false));
    } else if (next === 'end' && endTimer === undefined) {
      // Клиент баавгайн сүүлийн үгийг тоглож дуусахыг хүлээнэ.
      endTimer = setTimeout(() => shutdown({ type: 'end', reason: 'time' }), Math.max(0, playedUntil - Date.now()) + 500);
    }
  };

  // TTS горим: ээлж бүрт 2 хүсэлт: эхний хэсгийг (өгүүлбэр, таслал эсвэл 4 үг) бэлэн болмогц, үлдсэнийг Live
  // текстээ дуусгамагц. TTS-ийн өдрийн квот бага (Tier 1-д загвар бүрт 100 хүсэлт) тул хүсэлтийг хэмнэнэ.
  // TTS алдаа гарвал энэ ярилцлагын үлдсэн хэсэгт Live-ийн өөрийн дууг дамжуулна; тэр ээлжийн TTS дуу хараахан
  // яваагүй бол хадгалсан Live дууг илгээнэ (баавгай дуугүй болохгүй, давхар ч ярихгүй).
  const ttsModel = opts.ttsModel;
  let useLiveVoice = !ttsModel;
  let liveTurnAudio: Uint8Array[] = [];
  let liveTurnOpen = false;
  let ttsAudioInTurn = false;
  const speech = ttsModel
    ? new SpeechQueue((text, signal) => ttsStream(opts.ttsKey, ttsModel, text, signal), {
        audio: (pcm) => {
          ttsAudioInTurn = true;
          sendAudio(pcm);
        },
        turnEnd: () => {
          ttsAudioInTurn = false;
          bearTurnEnd();
        },
        error: (e) => {
          if (useLiveVoice) return;
          console.error('[tutor] TTS алдаа, Live-ийн дуу руу шилжлээ:', e);
          useLiveVoice = true;
          speech?.clear();
          if (!ttsAudioInTurn) for (const chunk of liveTurnAudio) sendAudio(chunk);
          ttsAudioInTurn = false;
          if (!liveTurnOpen) bearTurnEnd();
        },
      })
    : null;
  let turnText = '';
  let spoken = 0;
  /** Энэ ээлжийн текстийг бүгдийг нь TTS-д өгсөн (gen_done эсвэл turn_end, аль түрүүлж ирсэнээр). */
  let flushed = true;
  const flushTurn = () => {
    if (!speech || useLiveVoice || flushed) return;
    flushed = true;
    const rest = cleanForSpeech(turnText.slice(spoken));
    if (rest) speech.say(rest);
    speech.endTurn();
    turnText = '';
    spoken = 0;
  };

  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  const shutdown = (msg?: TutorServerMsg) => {
    if (closed) return;
    closed = true;
    // Gemini бэлэн болоогүй (хүүхэд баавгайтай ярьж амжаагүй) ярилцлагыг тоолохгүй.
    if (sessionId !== null) opts.session.end(sessionId, ready, Math.round(bearMs));
    speech?.clear();
    if (timer !== undefined) clearTimeout(timer);
    if (endTimer !== undefined) clearTimeout(endTimer);
    if (msg) send(msg);
    safeClose(client);
    safeClose(upstream);
  };

  // Gemini Live заримдаа эхлэхдээ "1011 Internal error"-оор хаагддаг: бэлэн болохоос өмнө бол нэг удаа дахин холбогдоно.
  let retried = false;
  const setup = JSON.stringify(liveSetup(opts.model, tutorSystemPrompt(ctx)));
  const reconnect = async () => {
    try {
      upstream = await connectLive(opts.key);
    } catch (e) {
      console.error('[tutor]', e);
      shutdown({ type: 'end', reason: 'error', message: 'Баавгайтай холбогдож чадсангүй' });
      return;
    }
    if (closed) {
      safeClose(upstream);
      return;
    }
    attach(upstream);
    upstream.send(setup);
  };

  const attach = (up: WebSocket) => {
    up.addEventListener('message', (e) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data as ArrayBuffer));
      } catch {
        return;
      }
      for (const ev of liveEvents(parsed)) {
        switch (ev.kind) {
          case 'ready': {
            ready = true;
            const now = Date.now();
            const first = ctx.focused ? ctx.questions[0] : undefined;
            send({
              type: 'ready',
              topic: first ? { subject: first.subject, prompt: first.prompt } : null,
              endsAt: now + GAME.TUTOR.MAX_SESSION_MS,
              serverNow: now,
            });
            timer = setTimeout(() => shutdown({ type: 'end', reason: 'time' }), GAME.TUTOR.MAX_SESSION_MS);
            upstream.send(JSON.stringify(liveText(tutorKickoff(ctx))));
            break;
          }
          case 'audio': {
            const pcm = fromB64(ev.data);
            if (!liveTurnOpen) {
              liveTurnOpen = true;
              liveTurnAudio = [];
            }
            if (useLiveVoice) sendAudio(pcm);
            else liveTurnAudio.push(pcm);
            break;
          }
          case 'bear_text':
            send({ type: 'bear_text', text: ev.text.replace(/[*#_`]/g, '') });
            if (speech && !useLiveVoice) {
              flushed = false;
              turnText += ev.text;
              const end = spoken === 0 ? speechChunkEnd(turnText, true) : -1;
              if (end > 0) {
                const chunk = cleanForSpeech(turnText.slice(0, end));
                if (chunk) speech.say(chunk);
                spoken = end;
              }
            }
            break;
          case 'kid_text':
            send({ type: 'kid_text', text: ev.text });
            break;
          case 'interrupted':
            speech?.clear();
            turnText = '';
            spoken = 0;
            flushed = true;
            send({ type: 'interrupted' });
            break;
          case 'gen_done':
            flushTurn();
            break;
          case 'turn_end':
            liveTurnOpen = false;
            if (speech && !useLiveVoice) flushTurn();
            else bearTurnEnd();
            break;
          case 'go_away':
            shutdown({ type: 'end', reason: 'time' });
            break;
        }
      }
    });
    up.addEventListener('close', (e) => {
      if (closed || up !== upstream) return;
      if (isQuotaClose(e.code, e.reason)) {
        console.error(`[tutor] Gemini-ийн квот дүүрсэн: ${e.reason}`);
        shutdown({ type: 'end', reason: 'error', message: 'Баавгай түр завгүй байна. Хэдэн минутын дараа дахин оролдоорой.' });
        return;
      }
      if (!ready && !retried) {
        retried = true;
        console.error(`[tutor] Gemini эхлэхдээ хаалаа (${e.code} ${e.reason}), дахин холбогдож байна`);
        void reconnect();
        return;
      }
      console.error(`[tutor] Gemini хаалаа: ${e.code} ${e.reason}`);
      shutdown({ type: 'end', reason: 'error', message: 'Баавгайтай холбоо тасарлаа' });
    });
    // error-ийн дараа close ирнэ: дахин холбогдох эсэхийг тэнд шийднэ.
    up.addEventListener('error', () => {
      if (up === upstream && ready) shutdown({ type: 'end', reason: 'error', message: 'Баавгайтай холбоо тасарлаа' });
    });
  };
  attach(upstream);

  /** Gemini хаагдаж байх үед send() алдаа шиддэг: тэр тохиолдолд close event shutdown хийнэ. */
  const sendUp = (msg: unknown) => {
    try {
      upstream.send(JSON.stringify(msg));
    } catch {
      // хаагдаж байна
    }
  };

  client.removeEventListener('close', onEarlyClose);
  client.addEventListener('message', (e) => {
    if (closed) return;
    if (typeof e.data !== 'string') {
      // Gemini бэлэн болохоос өмнөх mic-ийн дууг хаяна (баавгай эхэлж мэндэлнэ).
      if (!ready) return;
      sendUp(liveAudio(toB64(new Uint8Array(e.data))));
      return;
    }
    let msg: TutorClientMsg;
    try {
      msg = JSON.parse(e.data) as TutorClientMsg;
    } catch {
      return;
    }
    if (msg?.type === 'mic_off' && ready) sendUp(LIVE_AUDIO_END);
  });
  client.addEventListener('close', () => shutdown());
  client.addEventListener('error', () => shutdown());

  upstream.send(setup);
}
