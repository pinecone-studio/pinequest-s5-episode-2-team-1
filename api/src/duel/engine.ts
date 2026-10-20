// Тулааны цэвэр state machine. DuelRoom (Durable Object) нь socket, alarm, D1-ийг л хариуцна;
// бүх дүрэм энд байгаа тул unit тестээр шалгагдана. Функц бүр шинэ state буцаана.
import type { AvatarLook, DuelOutcome, DuelPhase, RevealInfo, ServerMsg, Subject, WsQuestion } from '../../../shared/types';
import { GAME } from '../config/game';

export interface DuelQuestion {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DuelPlayerInfo {
  id: number;
  username: string;
  avatar: AvatarLook;
}

export interface DuelInit {
  duelId: number;
  subject: Subject;
  stake: number;
  /** [үүсгэгч, хүлээн авагч] */
  players: [DuelPlayerInfo, DuelPlayerInfo];
  questions: DuelQuestion[];
}

/** D1 дээр хийх эцсийн тооцоо. */
export type Settlement = { kind: 'win'; winnerId: number; loserId: number } | { kind: 'refund' };

export interface DuelState {
  duelId: number;
  subject: Subject;
  stake: number;
  players: DuelPlayerInfo[];
  questions: DuelQuestion[];
  phase: DuelPhase;
  /** Одоогийн асуултын дугаар (эхлэхээс өмнө −1). */
  q: number;
  /** countdown / question / reveal үе шатын төгсгөл. */
  phaseEndsAt: number | null;
  questionEndsAt: number | null;
  /** Хоёулаа холбогдох эцсийн хугацаа (waiting үед). */
  connectDeadline: number | null;
  /** userId → идэвхтэй холболтын id (null = салсан). */
  conn: Record<string, string | null>;
  /** userId → энэ хугацаанд эргэж холбогдохгүй бол хожигдоно. */
  dropDeadline: Record<string, number>;
  scores: Record<string, number>;
  /** Одоогийн асуултад өгсөн хариулт (тоглогч бүр нэг л удаа). */
  attempts: Record<string, { choice: number; correct: boolean }>;
  qWinner: number | null;
  lastReveal: RevealInfo | null;
  outcome: DuelOutcome | null;
  settlement: Settlement | null;
  settled: boolean;
}

export interface Out {
  to: number | 'all';
  msg: ServerMsg;
}

export interface Step {
  state: DuelState;
  out: Out[];
}

const ACTIVE: DuelPhase[] = ['countdown', 'question', 'reveal'];
const key = (id: number) => String(id);

export function isPlayer(s: DuelState, userId: number): boolean {
  return s.players.some((p) => p.id === userId);
}

export function opponentOf(s: DuelState, userId: number): number {
  return s.players.find((p) => p.id !== userId)!.id;
}

function numericScores(s: DuelState): Record<number, number> {
  return Object.fromEntries(s.players.map((p) => [p.id, s.scores[key(p.id)] ?? 0]));
}

function wsQuestion(s: DuelState): WsQuestion | null {
  const question = s.questions[s.q];
  if (!question) return null;
  return {
    q: s.q,
    total: s.questions.length,
    questionId: question.id,
    prompt: question.prompt,
    options: question.options,
    endsAt: s.questionEndsAt ?? 0,
  };
}

export function createDuel(init: DuelInit, now: number): DuelState {
  const scores: Record<string, number> = {};
  const conn: Record<string, string | null> = {};
  for (const p of init.players) {
    scores[key(p.id)] = 0;
    conn[key(p.id)] = null;
  }
  return {
    duelId: init.duelId,
    subject: init.subject,
    stake: init.stake,
    players: init.players,
    questions: init.questions,
    phase: 'waiting',
    q: -1,
    phaseEndsAt: null,
    questionEndsAt: null,
    connectDeadline: now + GAME.DUEL.CONNECT_TIMEOUT_MS,
    conn,
    dropDeadline: {},
    scores,
    attempts: {},
    qWinner: null,
    lastReveal: null,
    outcome: null,
    settlement: null,
    settled: false,
  };
}

/** Тухайн тоглогчид илгээх бүтэн snapshot (холбогдох, дахин холбогдох үед). */
export function snapshot(s: DuelState, forUser: number, now: number): ServerMsg {
  const inQuestion = s.phase === 'question' || s.phase === 'reveal';
  return {
    type: 'state',
    phase: s.phase,
    duelId: s.duelId,
    subject: s.subject,
    stake: s.stake,
    players: s.players.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      connected: !!s.conn[key(p.id)],
      score: s.scores[key(p.id)] ?? 0,
    })),
    question: inQuestion ? wsQuestion(s) : null,
    myAnswer: inQuestion ? (s.attempts[key(forUser)] ?? null) : null,
    reveal: s.phase === 'reveal' ? s.lastReveal : null,
    deadline: s.phase === 'waiting' ? s.connectDeadline : s.phaseEndsAt,
    outcome: s.settled ? s.outcome : null,
    serverNow: now,
  };
}

/** Хамгийн ойрын deadline (alarm тавих). Тоглолт дууссан бол null. */
export function nextDeadline(s: DuelState): number | null {
  if (s.phase === 'finished' || s.phase === 'cancelled') return null;
  const times: number[] = [];
  if (s.phase === 'waiting' && s.connectDeadline !== null) times.push(s.connectDeadline);
  if (s.phaseEndsAt !== null) times.push(s.phaseEndsAt);
  times.push(...Object.values(s.dropDeadline));
  return times.length ? Math.min(...times) : null;
}

// ---------- шилжилтүүд (s-ийг өөрчилнө; зөвхөн step() дотроос) ----------

function startCountdown(s: DuelState, now: number, out: Out[]) {
  s.phase = 'countdown';
  s.connectDeadline = null;
  s.phaseEndsAt = now + GAME.DUEL.COUNTDOWN_MS;
  out.push({ to: 'all', msg: { type: 'countdown', startsAt: s.phaseEndsAt, serverNow: now } });
}

function startQuestion(s: DuelState, index: number, now: number, out: Out[]) {
  s.phase = 'question';
  s.q = index;
  s.attempts = {};
  s.qWinner = null;
  s.questionEndsAt = now + GAME.DUEL.QUESTION_MS;
  s.phaseEndsAt = s.questionEndsAt;
  out.push({ to: 'all', msg: { type: 'question', serverNow: now, ...wsQuestion(s)! } });
}

function reveal(s: DuelState, now: number, out: Out[]) {
  const question = s.questions[s.q];
  s.phase = 'reveal';
  s.phaseEndsAt = now + GAME.DUEL.REVEAL_MS;
  s.lastReveal = {
    q: s.q,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    winnerId: s.qWinner,
    scores: numericScores(s),
  };
  out.push({ to: 'all', msg: { type: 'reveal', nextAt: s.phaseEndsAt, serverNow: now, ...s.lastReveal } });
}

function finish(s: DuelState, winnerId: number | null, reason: DuelOutcome['reason']) {
  s.phase = 'finished';
  s.phaseEndsAt = null;
  s.connectDeadline = null;
  s.dropDeadline = {};
  const deltas: Record<number, number> = {};
  for (const p of s.players) deltas[p.id] = winnerId === null ? 0 : p.id === winnerId ? s.stake : -s.stake;
  s.outcome = { winnerId, reason, scores: numericScores(s), deltas, points: {} };
  s.settlement = winnerId === null ? { kind: 'refund' } : { kind: 'win', winnerId, loserId: opponentOf(s, winnerId) };
}

function cancelNoShow(s: DuelState) {
  s.phase = 'cancelled';
  s.phaseEndsAt = null;
  s.connectDeadline = null;
  s.dropDeadline = {};
  s.outcome = {
    winnerId: null,
    reason: 'no_show',
    scores: numericScores(s),
    deltas: Object.fromEntries(s.players.map((p) => [p.id, 0])),
    points: {},
  };
  s.settlement = { kind: 'refund' };
}

function finishByScore(s: DuelState) {
  const [a, b] = s.players;
  const sa = s.scores[key(a.id)] ?? 0;
  const sb = s.scores[key(b.id)] ?? 0;
  if (sa === sb) finish(s, null, 'draw');
  else finish(s, sa > sb ? a.id : b.id, 'score');
}

/** Хугацаа нь өнгөрсөн бүх deadline-ийг дарааллаар нь боловсруулна. */
function advance(s: DuelState, now: number, out: Out[]) {
  for (let guard = 0; guard < 16; guard++) {
    if (s.phase === 'finished' || s.phase === 'cancelled') return;
    if (s.phase === 'waiting') {
      if (s.connectDeadline !== null && now >= s.connectDeadline) cancelNoShow(s);
      return;
    }
    const dropped = Object.entries(s.dropDeadline)
      .filter(([, t]) => now >= t)
      .sort((x, y) => x[1] - y[1]);
    if (dropped.length) {
      // 10 секундээс удаан салсан тоглогч хожигдоно (хоёулаа бол түрүүлж хугацаа нь дууссан нь).
      finish(s, opponentOf(s, Number(dropped[0][0])), 'forfeit');
      continue;
    }
    if (s.phaseEndsAt === null || now < s.phaseEndsAt) return;
    if (s.phase === 'countdown') startQuestion(s, 0, now, out);
    else if (s.phase === 'question') reveal(s, now, out); // хугацаа дууссан: хэн ч аваагүй
    else if (s.q + 1 < s.questions.length) startQuestion(s, s.q + 1, now, out);
    else finishByScore(s);
  }
}

function step(s0: DuelState, now: number, apply?: (s: DuelState, out: Out[]) => void): Step {
  const s = structuredClone(s0);
  const out: Out[] = [];
  advance(s, now, out);
  apply?.(s, out);
  advance(s, now, out);
  return { state: s, out };
}

// ---------- гадны үйл явдлууд ----------

export function onTick(s0: DuelState, now: number): Step {
  return step(s0, now);
}

export function onConnect(s0: DuelState, userId: number, connId: string, now: number): Step {
  return step(s0, now, (s, out) => {
    s.conn[key(userId)] = connId;
    delete s.dropDeadline[key(userId)];
    out.push({ to: userId, msg: snapshot(s, userId, now) });
    out.push({ to: opponentOf(s, userId), msg: { type: 'presence', userId, connected: true } });
    if (s.phase === 'waiting' && s.players.every((p) => s.conn[key(p.id)])) startCountdown(s, now, out);
  });
}

export function onDisconnect(s0: DuelState, userId: number, connId: string, now: number): Step {
  return step(s0, now, (s, out) => {
    // Шинэ холболтоор солигдсон хуучин socket бол тоохгүй.
    if (s.conn[key(userId)] !== connId) return;
    s.conn[key(userId)] = null;
    out.push({ to: opponentOf(s, userId), msg: { type: 'presence', userId, connected: false } });
    if (ACTIVE.includes(s.phase)) s.dropDeadline[key(userId)] = now + GAME.DUEL.DISCONNECT_GRACE_MS;
  });
}

/** Хамгийн түрүүнд ирсэн зөв хариулт асуултыг авна; буруу хариулсан тоглогч дахин хариулахгүй. */
export function onAnswer(s0: DuelState, userId: number, q: number, choice: number, now: number): Step {
  return step(s0, now, (s, out) => {
    const k = key(userId);
    if (s.phase !== 'question' || q !== s.q) {
      out.push({ to: userId, msg: { type: 'error', code: 'NOT_ACCEPTING' } });
      return;
    }
    if (s.attempts[k]) {
      out.push({ to: userId, msg: { type: 'error', code: 'ALREADY_ANSWERED' } });
      return;
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= s.questions[s.q].options.length) {
      out.push({ to: userId, msg: { type: 'error', code: 'BAD_CHOICE' } });
      return;
    }
    const correct = choice === s.questions[s.q].correctIndex;
    s.attempts[k] = { choice, correct };
    out.push({ to: userId, msg: { type: 'answer_result', q, choice, correct } });
    out.push({ to: opponentOf(s, userId), msg: { type: 'opponent_answered', q, correct } });
    if (correct) {
      s.qWinner = userId;
      s.scores[k] = (s.scores[k] ?? 0) + 1;
      reveal(s, now, out);
    } else if (s.players.every((p) => s.attempts[key(p.id)])) {
      reveal(s, now, out); // хоёулаа буруу: хэн ч авахгүй
    }
  });
}
