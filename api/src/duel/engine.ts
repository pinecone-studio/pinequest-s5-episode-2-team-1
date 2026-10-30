// Тулааны цэвэр state machine. DuelRoom (Durable Object) нь socket, alarm, D1-ийг л хариуцна;
// бүх дүрэм энд байгаа тул unit тестээр шалгагдана. Функц бүр шинэ state буцаана.
// 1 vs 1 ба багийн тулаан (2 vs 2 … 5 vs 5): тоглогч бүр өөр асуулт авч нэг удаа хариулна, зөв хариулт бүр 1 оноо.
// Зөв хариулт, оноог бүх холбогдсон тоглогч хариулмагц (эсвэл хугацаа дуусахад) reveal-ээр л хэлнэ.
import type { AvatarLook, BearLook, DuelOutcome, DuelPhase, DuelTeam, RevealInfo, ServerMsg, Subject, WsQuestion } from '../../../shared/types';
import { DEFAULT_LOOK } from '../config/cosmetics';
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
  name: string;
  avatar: AvatarLook;
  /** deploy-оос өмнө эхэлсэн тулааны хадгалсан тоглогчид look, team байхгүй */
  look?: BearLook;
  team?: DuelTeam;
}

export interface DuelInit {
  duelId: number;
  subject: Subject;
  stake: number;
  /** 1 = 1 vs 1; 2–5 = багийн тулаан. */
  teamSize?: number;
  /** Үүсгэгч эхэнд. 1 vs 1-д [үүсгэгч, хүлээн авагч]. */
  players: DuelPlayerInfo[];
  /** userId → тухайн тоглогчийн өөрийн асуултууд (хүн бүрт ижил тоотой). */
  questions: Record<string, DuelQuestion[]>;
}

/** D1 дээр хийх эцсийн тооцоо: ялсан багийн гишүүн бүр хоёр бооцоо авна. */
export type Settlement = { kind: 'win'; winners: number[]; losers: number[] } | { kind: 'refund' };

export interface DuelState {
  duelId: number;
  subject: Subject;
  stake: number;
  teamSize: number;
  players: DuelPlayerInfo[];
  /** userId → тухайн тоглогчийн өөрийн асуултууд. */
  questions: Record<string, DuelQuestion[]>;
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
  /** Одоогийн асуултад өгсөн хариулт (тоглогч бүр нэг л удаа). Зөв эсэхийг reveal хүртэл хэнд ч илгээхгүй. */
  attempts: Record<string, { choice: number; correct: boolean }>;
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
const otherTeam = (t: DuelTeam): DuelTeam => (t === 'a' ? 'b' : 'a');

export function isPlayer(s: DuelState, userId: number): boolean {
  return s.players.some((p) => p.id === userId);
}

/** Хуучин (team-гүй) state-д: эхний тоглогч 'a', бусад нь 'b'. */
export function teamOf(s: DuelState, userId: number): DuelTeam {
  const i = s.players.findIndex((p) => p.id === userId);
  return s.players[i]?.team ?? (i === 0 ? 'a' : 'b');
}

function membersOf(s: DuelState, team: DuelTeam): number[] {
  return s.players.filter((p) => teamOf(s, p.id) === team).map((p) => p.id);
}

/** userId-аас бусад бүх тоглогч (presence, хариулсан мэдэгдэл). */
function othersOf(s: DuelState, userId: number): number[] {
  return s.players.filter((p) => p.id !== userId).map((p) => p.id);
}

const isTeamDuel = (s: DuelState) => (s.teamSize ?? 1) > 1;

function numericScores(s: DuelState): Record<number, number> {
  return Object.fromEntries(s.players.map((p) => [p.id, s.scores[key(p.id)] ?? 0]));
}

function teamScores(s: DuelState): Record<DuelTeam, number> {
  const t: Record<DuelTeam, number> = { a: 0, b: 0 };
  for (const p of s.players) t[teamOf(s, p.id)] += s.scores[key(p.id)] ?? 0;
  return t;
}

const connected = (s: DuelState, userId: number) => !!s.conn[key(userId)];

/** Асуултын тоо (хүн бүрт ижил). */
const total = (s: DuelState) => s.questions[key(s.players[0].id)]?.length ?? 0;
const questionOf = (s: DuelState, userId: number): DuelQuestion | undefined => s.questions[key(userId)]?.[s.q];

function wsQuestion(s: DuelState, userId: number): WsQuestion | null {
  const question = questionOf(s, userId);
  if (!question) return null;
  return {
    q: s.q,
    total: total(s),
    questionId: question.id,
    prompt: question.prompt,
    options: question.options,
    endsAt: s.questionEndsAt ?? 0,
  };
}

/** Тухайн тоглогчийн өөрийн асуултын зөв хариулт, тайлбар ба бүх тоглогчийн дүн. */
function revealFor(s: DuelState, userId: number): RevealInfo | null {
  const question = questionOf(s, userId);
  if (!question) return null;
  return {
    q: s.q,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    correct: s.players.filter((p) => s.attempts[key(p.id)]?.correct).map((p) => p.id),
    scores: numericScores(s),
    teamScores: teamScores(s),
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
    teamSize: init.teamSize ?? 1,
    players: init.players.map((p, i) => ({ ...p, team: p.team ?? (i === 0 ? 'a' : 'b') })),
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
    outcome: null,
    settlement: null,
    settled: false,
  };
}

/** Тухайн тоглогчид илгээх бүтэн snapshot (холбогдох, дахин холбогдох үед). */
export function snapshot(s: DuelState, forUser: number, now: number): ServerMsg {
  const inQuestion = s.phase === 'question' || s.phase === 'reveal';
  const mine = s.attempts[key(forUser)];
  return {
    type: 'state',
    phase: s.phase,
    duelId: s.duelId,
    subject: s.subject,
    stake: s.stake,
    teamSize: s.teamSize ?? 1,
    players: s.players.map((p) => ({
      id: p.id,
      username: p.username,
      // deploy-оос өмнө эхэлсэн тулааны хадгалсан тоглогчид name байхгүй
      name: p.name ?? p.username,
      avatar: p.avatar,
      look: p.look ?? DEFAULT_LOOK,
      team: teamOf(s, p.id),
      connected: connected(s, p.id),
      score: s.scores[key(p.id)] ?? 0,
    })),
    question: inQuestion ? wsQuestion(s, forUser) : null,
    myAnswer: inQuestion && mine ? { choice: mine.choice } : null,
    reveal: s.phase === 'reveal' ? revealFor(s, forUser) : null,
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
  s.questionEndsAt = now + GAME.DUEL.QUESTION_MS;
  s.phaseEndsAt = s.questionEndsAt;
  for (const p of s.players) out.push({ to: p.id, msg: { type: 'question', serverNow: now, ...wsQuestion(s, p.id)! } });
}

/** Оноог энд л нэмнэ: асуултын үед snapshot-оор ч зөв эсэх ил гарахгүй. */
function reveal(s: DuelState, now: number, out: Out[]) {
  s.phase = 'reveal';
  s.phaseEndsAt = now + GAME.DUEL.REVEAL_MS;
  for (const p of s.players) if (s.attempts[key(p.id)]?.correct) s.scores[key(p.id)] = (s.scores[key(p.id)] ?? 0) + 1;
  for (const p of s.players) out.push({ to: p.id, msg: { type: 'reveal', nextAt: s.phaseEndsAt, serverNow: now, ...revealFor(s, p.id)! } });
}

function finish(s: DuelState, winnerTeam: DuelTeam | null, reason: DuelOutcome['reason']) {
  s.phase = 'finished';
  s.phaseEndsAt = null;
  s.connectDeadline = null;
  s.dropDeadline = {};
  const deltas: Record<number, number> = {};
  for (const p of s.players) deltas[p.id] = winnerTeam === null ? 0 : teamOf(s, p.id) === winnerTeam ? s.stake : -s.stake;
  const winners = winnerTeam === null ? [] : membersOf(s, winnerTeam);
  s.outcome = {
    winnerId: !isTeamDuel(s) && winners.length === 1 ? winners[0] : null,
    winnerTeam,
    reason,
    scores: numericScores(s),
    teamScores: teamScores(s),
    deltas,
    points: {},
  };
  s.settlement = winnerTeam === null ? { kind: 'refund' } : { kind: 'win', winners, losers: membersOf(s, otherTeam(winnerTeam)) };
}

function cancelNoShow(s: DuelState) {
  s.phase = 'cancelled';
  s.phaseEndsAt = null;
  s.connectDeadline = null;
  s.dropDeadline = {};
  s.outcome = {
    winnerId: null,
    winnerTeam: null,
    reason: 'no_show',
    scores: numericScores(s),
    teamScores: teamScores(s),
    deltas: Object.fromEntries(s.players.map((p) => [p.id, 0])),
    points: {},
  };
  s.settlement = { kind: 'refund' };
}

function finishByScore(s: DuelState) {
  const { a, b } = teamScores(s);
  if (a === b) finish(s, null, 'draw');
  else finish(s, a > b ? 'a' : 'b', 'score');
}

/** Багийн аль нэг гишүүн холбоотой эсвэл эргэж холбогдох хугацаатай байна. */
function teamAlive(s: DuelState, team: DuelTeam): boolean {
  return membersOf(s, team).some((id) => connected(s, id) || s.dropDeadline[key(id)] !== undefined);
}

/**
 * Бүх тоглогч энэ асуултад хариулсан. Багийн тулаанд салсан гишүүнийг хүлээхгүй; 1 vs 1-д түр салсан
 * өрсөлдөгч буцаж ирээд хариулж болно.
 */
function allAnswered(s: DuelState): boolean {
  return s.players.every((p) => s.attempts[key(p.id)] || (isTeamDuel(s) && !connected(s, p.id)));
}

/** Хугацаа нь өнгөрсөн бүх deadline-ийг дарааллаар нь боловсруулна. */
function advance(s: DuelState, now: number, out: Out[]) {
  for (let guard = 0; guard < 16; guard++) {
    if (s.phase === 'finished' || s.phase === 'cancelled') return;
    if (s.phase === 'waiting') {
      if (s.connectDeadline === null || now < s.connectDeadline) return;
      // Багийн тулаанд хоёр багаас хоёуланд нь хүн ирсэн бол ирээгүйг нь хүлээлгүй эхэлнэ.
      if (isTeamDuel(s) && membersOf(s, 'a').some((id) => connected(s, id)) && membersOf(s, 'b').some((id) => connected(s, id))) {
        startCountdown(s, now, out);
        continue;
      }
      cancelNoShow(s);
      return;
    }
    const dropped = Object.entries(s.dropDeadline)
      .filter(([, t]) => now >= t)
      .sort((x, y) => x[1] - y[1]);
    if (dropped.length) {
      // 10 секундээс удаан салсан тоглогч тоглолтоос гарна; багт нь хэн ч үлдээгүй бол баг нь хожигдоно
      // (1 vs 1-д шууд; хоёулаа бол түрүүлж хугацаа нь дууссан нь).
      const userId = Number(dropped[0][0]);
      delete s.dropDeadline[key(userId)];
      const team = teamOf(s, userId);
      if (!teamAlive(s, team)) finish(s, otherTeam(team), 'forfeit');
      continue;
    }
    if (s.phaseEndsAt === null || now < s.phaseEndsAt) return;
    if (s.phase === 'countdown') startQuestion(s, 0, now, out);
    else if (s.phase === 'question') reveal(s, now, out); // хугацаа дууссан
    else if (s.q + 1 < total(s)) startQuestion(s, s.q + 1, now, out);
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
    for (const o of othersOf(s, userId)) out.push({ to: o, msg: { type: 'presence', userId, connected: true } });
    if (s.phase === 'waiting' && s.players.every((p) => s.conn[key(p.id)])) startCountdown(s, now, out);
  });
}

export function onDisconnect(s0: DuelState, userId: number, connId: string, now: number): Step {
  return step(s0, now, (s, out) => {
    // Шинэ холболтоор солигдсон хуучин socket бол тоохгүй.
    if (s.conn[key(userId)] !== connId) return;
    s.conn[key(userId)] = null;
    for (const o of othersOf(s, userId)) out.push({ to: o, msg: { type: 'presence', userId, connected: false } });
    if (ACTIVE.includes(s.phase)) s.dropDeadline[key(userId)] = now + GAME.DUEL.DISCONNECT_GRACE_MS;
    // Багийн тулаанд хариулаагүй сүүлчийн гишүүн салбал бусад нь хугацаа дуустал хүлээхгүй.
    if (s.phase === 'question' && isTeamDuel(s) && allAnswered(s)) reveal(s, now, out);
  });
}

/**
 * Тоглогч өөрийн асуултад нэг л удаа хариулна; зөв хариулт бүр 1 оноо. Зөв эсэхийг хэнд ч хэлэхгүй,
 * бүгд хариулмагц (эсвэл хугацаа дуусахад) reveal.
 */
export function onAnswer(s0: DuelState, userId: number, q: number, choice: number, now: number): Step {
  return step(s0, now, (s, out) => {
    const k = key(userId);
    const question = questionOf(s, userId);
    if (s.phase !== 'question' || q !== s.q || !question) {
      out.push({ to: userId, msg: { type: 'error', code: 'NOT_ACCEPTING' } });
      return;
    }
    if (s.attempts[k]) {
      out.push({ to: userId, msg: { type: 'error', code: 'ALREADY_ANSWERED' } });
      return;
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      out.push({ to: userId, msg: { type: 'error', code: 'BAD_CHOICE' } });
      return;
    }
    s.attempts[k] = { choice, correct: choice === question.correctIndex };
    out.push({ to: userId, msg: { type: 'answer_result', q, choice } });
    for (const o of othersOf(s, userId)) out.push({ to: o, msg: { type: 'opponent_answered', q, userId } });
    if (allAnswered(s)) reveal(s, now, out);
  });
}
