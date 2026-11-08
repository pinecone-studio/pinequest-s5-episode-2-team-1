import { Hono } from 'hono';
import type { TutorClientMsg, TutorServerMsg } from '../../../shared/types';
import { GAME } from '../config/game';
import type { AppEnv } from '../env';
import { toB64 } from '../lib/auth';
import { ApiError, parseId } from '../lib/errors';
import { socketUserId } from '../lib/session';
import {
  askTutor,
  createTutorCache,
  deleteTutorCache,
  pcmToWav,
  shownHeard,
  TutorBusyError,
  type TutorContent,
  tutorAsked,
  tutorKickoff,
  tutorRequest,
  tutorSystemPrompt,
} from '../llm/tutor';
import { effectivePlan, tutorDailyLimit } from '../domain/plan';
import { endTutorSession, loadTutorContext, startTutorSession } from '../services/tutor';
import { getUserRow, requireLife } from '../services/users';

export const tutorRoutes = new Hono<AppEnv>();

const BUSY = 'Баавгай түр завгүй байна. Хэдэн минутын дараа дахин оролдоорой.';
const LOST = 'Баавгайтай холбогдож чадсангүй';
/** Хүүхдийн яриа нэг ээлжинд ийм хэмжээнээс их бол илүүг нь хаяна (PCM16 = нэг sample 2 байт). */
const MAX_TALK_BYTES = (GAME.TUTOR.INPUT_RATE * 2 * GAME.TUTOR.MAX_TALK_MS) / 1000;

/**
 * Баавгайтай ярилцах: утас ↔ энэ Worker ↔ Gemini Flash Lite. Хүүхэд товч дарж ярина; Worker дууг нь хураагаад,
 * суллахад нэг HTTP хүсэлтээр яриа түүхтэй нь Gemini-д өгнө, баавгай зөвхөн бичгээр хариулна. Gemini-тэй холболт
 * барьдаггүй тул зэрэг ярих хүүхдийн тоог зөвхөн minute/day квот хязгаарлана. Түлхүүр, system prompt (хүүхдийн алдсан
 * бодлого) серверээс гарахгүй. `?questionId=` өгвөл тэр бодлогын тухай, үгүй бол сүүлд алдсан хэдэн бодлогын тухай ярина.
 */
tutorRoutes.get('/ws', async (c) => {
  const userId = await socketUserId(c);
  // Хүүхдийн ярианд төлбөртэй түлхүүр тусдаа байж болно; үгүй бол ерөнхий түлхүүр.
  const key = c.env.GEMINI_TUTOR_API_KEY || c.env.GEMINI_API_KEY || '';
  const raw = c.req.query('questionId');
  const questionId = raw === undefined ? undefined : parseId(raw);

  let dailyLimit: number = GAME.TUTOR.DAILY_SESSIONS.free;
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  // compatibility_date-аас хамаарч binary нь Blob ирдэг тул ArrayBuffer болгоно (дуу дараалал алдагдахгүй, sync).
  server.binaryType = 'arraybuffer';
  // Upgrade-ийн дараах алдааг (бодлого олдсонгүй, хязгаар) клиент socket-оор уншиж харуулна.
  c.executionCtx.waitUntil(
    relay(server, {
      key,
      model: c.env.GEMINI_TUTOR_MODEL || 'gemini-3.5-flash-lite',
      background: (p) => c.executionCtx.waitUntil(p),
      session: {
        start: () => startTutorSession(c.env.DB, userId, dailyLimit),
        end: (id, counted, bearMs) =>
          c.executionCtx.waitUntil(endTutorSession(c.env.DB, id, counted, bearMs).catch((e) => console.error('[tutor] session', e))),
      },
      load: async () => {
        // Upgrade-ийн өмнө HTTP 503 өгвөл клиент зөвхөн "холбоо тасарлаа" л хардаг тул socket-оор мэдэгдэнэ.
        if (!key) throw new ApiError(503, 'TUTOR_UNAVAILABLE', 'Баавгай одоо ярих боломжгүй байна. Дараа дахин оролдоно уу.');
        // Амьгүй бол нөхөгдтөл баавгайтай ярилцах хаалттай.
        const user = await getUserRow(c.env.DB, userId);
        requireLife(user);
        // Багцын өдрийн эрх: start() үүнийг ашиглана (load нь start-аас өмнө дуусна).
        dailyLimit = tutorDailyLimit(effectivePlan(user, Date.now()));
        return loadTutorContext(c.env.DB, userId, questionId);
      },
    }),
  );
  return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'bearer' } });
});

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
    /** Хэрэглэгчийн өдрийн / зэрэг ярилцлагын хязгаар (services/tutor). */
    /** Socket хаагдсаны дараа ч дуусах ёстой ажил (кэш устгах). */
    background: (p: Promise<unknown>) => void;
    session: { start: () => Promise<number>; end: (id: number, counted: boolean, bearMs: number) => void };
    load: () => ReturnType<typeof loadTutorContext>;
  },
) {
  let closed = false;
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

  let ctx: Awaited<ReturnType<typeof loadTutorContext>>;
  let sessionId: number;
  try {
    ctx = await opts.load();
    if (clientGone) return;
    sessionId = await opts.session.start();
    if (clientGone) {
      opts.session.end(sessionId, false, 0);
      return;
    }
  } catch (e) {
    if (!(e instanceof ApiError)) console.error('[tutor]', e);
    // code: апп өдрийн эрх дууссан (TUTOR_LIMIT) үед багцын санал харуулна.
    send({ type: 'end', reason: 'error', message: e instanceof ApiError ? e.message : LOST, code: e instanceof ApiError ? e.code : undefined });
    safeClose(client, 1011, 'error');
    return;
  }

  const system = tutorSystemPrompt(ctx);
  let cacheName: string | null = null;
  let cacheDisabled = false;
  const cachePromise = GAME.TUTOR.PROMPT_CACHE
    ? createTutorCache(opts.key, opts.model, system, GAME.TUTOR.CACHE_TTL_S)
    : Promise.resolve(null);
  opts.background(cachePromise.then((name) => {
    if (!name) return;
    if (closed || cacheDisabled) {
      opts.background(deleteTutorCache(opts.key, name));
      return;
    }
    cacheName = name;
  }));
  const hideAnswer = ctx.questions.length > 0 && ctx.questions.every((q) => q.hideAnswer);
  /** Өмнөх ээлжүүд бичвэрээр: дууг дахин илгээвэл зардал нь ээлж бүрт өснө. */
  const history: TutorContent[] = [];
  let replies = 0;
  /** Gemini-д явуулсан хүсэлтийн тоо: хүүхэд тасалсан, гарсан ч төлбөр гардаг тул хязгаарт тоолно. */
  let requests = 0;
  /** Gemini алдаа өгсөн: баавгай хариулж амжаагүй бол ярилцлагыг тоолохгүй. */
  let failed = false;
  /** Хүүхдийн уншсан хугацааны тооцоо (`bear_ms`). */
  let bearMs = 0;
  /** Gemini хариу үүсгэж байна: энэ хооронд хүүхдийн дууг авахгүй. */
  let busy = false;
  /** Хүүхэд "Тасал" дарсан: энэ ээлжийн хариуг хаяна. */
  let muted = false;
  let talking = false;
  let finishing = false;
  let chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  const shutdown = (msg?: TutorServerMsg) => {
    if (closed) return;
    closed = true;
    cacheDisabled = true;
    if (cacheName) {
      opts.background(deleteTutorCache(opts.key, cacheName));
      cacheName = null;
    }
    // Gemini-ийн алдаанаас болж баавгай нэг ч хариулж амжаагүй бол тоолохгүй. Хүүхэд өөрөө гарсан бол тоолно: хүсэлт явсан.
    opts.session.end(sessionId, replies > 0 || !failed, Math.round(bearMs));
    if (timer !== undefined) clearTimeout(timer);
    if (endTimer !== undefined) clearTimeout(endTimer);
    if (msg) send(msg);
    safeClose(client);
  };

  /** Баавгайн нэг ээлж. asked = хүүхдийн хүсэлт (дуу эсвэл заавар), said = түүхэнд үлдэх бичвэр (дуу бол heard-ээр солигдоно). */
  const turn = async (asked: TutorContent, said: string) => {
    busy = true;
    requests++;
    const last = requests >= GAME.TUTOR.MAX_REPLIES;
    try {
      const contents = [...history, tutorAsked(asked, last)];
      const usedCache = cacheName ?? undefined;
      let out;
      try {
        out = await askTutor(opts.key, opts.model, tutorRequest(system, contents, hideAnswer, usedCache));
      } catch (e) {
        if (closed) return;
        if (!usedCache || e instanceof TutorBusyError) throw e;
        cacheDisabled = true;
        cacheName = null;
        opts.background(deleteTutorCache(opts.key, usedCache));
        out = await askTutor(opts.key, opts.model, tutorRequest(system, contents, hideAnswer));
      }
      if (closed) return;
      busy = false;
      if (muted) {
        muted = false;
        send({ type: 'turn_end' });
        if (!last) return;
        finishing = true;
        endTimer = setTimeout(() => shutdown({ type: 'end', reason: 'done' }), 500);
        return;
      }
      replies++;
      history.push({ role: 'user', parts: [{ text: out.heard || said }] }, { role: 'model', parts: [{ text: out.reply }] });
      const shown = shownHeard(out.heard, ctx.questions);
      if (shown) send({ type: 'kid_text', text: shown });
      send({ type: 'bear_text', text: out.reply });
      send({ type: 'turn_end' });
      const readMs = Math.min(out.reply.length * GAME.TUTOR.READ_MS_PER_CHAR, GAME.TUTOR.READ_MAX_MS);
      bearMs += readMs;
      if (out.done || last) {
        // Хүүхэд баавгайн сүүлийн хариултыг уншиж амжтал хүлээнэ.
        finishing = true;
        endTimer = setTimeout(() => shutdown({ type: 'end', reason: 'done' }), readMs + 500);
      }
    } catch (e) {
      busy = false;
      failed = true;
      console.error('[tutor]', e);
      shutdown({ type: 'end', reason: 'error', message: e instanceof TutorBusyError ? BUSY : LOST });
    }
  };

  client.removeEventListener('close', onEarlyClose);
  client.addEventListener('message', (e) => {
    if (closed) return;
    if (typeof e.data !== 'string') {
      if (!talking || bytes >= MAX_TALK_BYTES) return;
      const piece = new Uint8Array(e.data).subarray(0, MAX_TALK_BYTES - bytes);
      chunks.push(piece);
      bytes += piece.byteLength;
      return;
    }
    let msg: TutorClientMsg;
    try {
      msg = JSON.parse(e.data) as TutorClientMsg;
    } catch {
      return;
    }
    if (msg?.type === 'talk_start' && !busy && !finishing) {
      talking = true;
      chunks = [];
      bytes = 0;
    }
    if (msg?.type === 'talk_end' && talking) {
      talking = false;
      if (bytes === 0) {
        send({ type: 'turn_end' });
        return;
      }
      const data = toB64(pcmToWav(chunks, GAME.TUTOR.INPUT_RATE));
      chunks = [];
      bytes = 0;
      void turn({ role: 'user', parts: [{ inlineData: { mimeType: 'audio/wav', data } }] }, '(хүүхдийн яриа сонсогдсонгүй)');
    }
    if (msg?.type === 'interrupt' && busy) muted = true;
  });
  client.addEventListener('close', () => shutdown());
  client.addEventListener('error', () => shutdown());

  const now = Date.now();
  const first = ctx.focused ? ctx.questions[0] : undefined;
  send({
    type: 'ready',
    topic: first ? { subject: first.subject, prompt: first.prompt } : null,
    endsAt: now + GAME.TUTOR.MAX_SESSION_MS,
    serverNow: now,
  });
  timer = setTimeout(() => shutdown({ type: 'end', reason: 'time' }), GAME.TUTOR.MAX_SESSION_MS);
  const kickoff = tutorKickoff(ctx);
  await turn({ role: 'user', parts: [{ text: kickoff }] }, kickoff);
}
