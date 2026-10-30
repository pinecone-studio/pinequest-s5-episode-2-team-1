import { describe, expect, it } from 'vitest';
import type { ServerMsg } from '../../shared/types';
import { GAME } from '../src/config/game';
import { createDuel, type DuelInit, type DuelState, nextDeadline, onAnswer, onConnect, onDisconnect, onTick, type Out, snapshot } from '../src/duel/engine';

const { QUESTION_MS, REVEAL_MS, COUNTDOWN_MS, CONNECT_TIMEOUT_MS, DISCONNECT_GRACE_MS } = GAME.DUEL;
const A = 1;
const B = 2;
const T0 = 1_000_000;

/** Тоглогч бүрт өөр 3 асуулт: p-р тоглогчийн i-р асуултын зөв хариулт = (i + p) % 4. */
const deal = (ids: number[]) =>
  Object.fromEntries(
    ids.map((id, p) => [
      id,
      [0, 1, 2].map((i) => ({ id: id * 100 + i, prompt: `Q${id}.${i}`, options: ['а', 'б', 'в', 'г'], correctIndex: (i + p) % 4, explanation: `E${id}.${i}` })),
    ]),
  );

const init: DuelInit = {
  duelId: 7,
  subject: 'math',
  stake: 10,
  players: [
    { id: A, username: 'aa', name: 'aa', avatar: {} },
    { id: B, username: 'bb', name: 'bb', avatar: {} },
  ],
  questions: deal([A, B]),
};
const right = (s: DuelState, id: number, q: number) => s.questions[String(id)][q].correctIndex;
const wrong = (s: DuelState, id: number, q: number) => (right(s, id, q) + 1) % 4;

const types = (out: Out[]) => out.map((o) => `${o.to}:${o.msg.type}`);
const msgOf = <T extends ServerMsg['type']>(out: Out[], type: T, to?: number | 'all') =>
  out.find((o) => o.msg.type === type && (to === undefined || o.to === to))?.msg as Extract<ServerMsg, { type: T }> | undefined;

/** Хоёулаа холбогдож, countdown дуусаад эхний асуулт эхэлсэн төлөв. */
function inQuestion0(): { s: DuelState; t: number } {
  let s = createDuel(init, T0);
  s = onConnect(s, A, 'ca', T0 + 100).state;
  s = onConnect(s, B, 'cb', T0 + 200).state;
  const t = T0 + 200 + COUNTDOWN_MS;
  s = onTick(s, t).state;
  return { s, t };
}

describe('эхлэл', () => {
  it('хоёулаа холбогдмогц 3 сек countdown, дараа нь хүн бүрт өөр асуулт зэрэг', () => {
    let s = createDuel(init, T0);
    expect(s.phase).toBe('waiting');
    const a = onConnect(s, A, 'ca', T0 + 100);
    expect(types(a.out)).toEqual([`${A}:state`, `${B}:presence`]);
    expect(a.state.phase).toBe('waiting');
    const b = onConnect(a.state, B, 'cb', T0 + 200);
    expect(b.state.phase).toBe('countdown');
    expect(msgOf(b.out, 'countdown', 'all')?.startsAt).toBe(T0 + 200 + COUNTDOWN_MS);
    s = b.state;
    expect(onTick(s, T0 + 200 + COUNTDOWN_MS - 1).state.phase).toBe('countdown');
    const q = onTick(s, T0 + 200 + COUNTDOWN_MS);
    expect(q.state.phase).toBe('question');
    expect(QUESTION_MS).toBe(30_000);
    expect(msgOf(q.out, 'question', A)).toMatchObject({ q: 0, total: 3, prompt: `Q${A}.0`, endsAt: T0 + 200 + COUNTDOWN_MS + QUESTION_MS });
    expect(msgOf(q.out, 'question', B)).toMatchObject({ q: 0, total: 3, prompt: `Q${B}.0` });
    expect(JSON.stringify(q.out)).not.toMatch(/correctIndex|explanation/);
  });

  it('snapshot асуултын үед зөв хариулт, зөв эсэхийг агуулахгүй', () => {
    const { s, t } = inQuestion0();
    const answered = onAnswer(s, A, 0, right(s, A, 0), t + 100).state;
    const snap = snapshot(answered, A, t + 200);
    expect(snap).toMatchObject({ myAnswer: { choice: right(s, A, 0) }, players: [{ score: 0 }, { score: 0 }] });
    expect(JSON.stringify(snap)).not.toMatch(/correctIndex|correct"|"E/);
  });
});

describe('асуултын дүрэм', () => {
  it('зөв хариулт асуултыг хаахгүй; зөв эсэхийг хэнд ч хэлэхгүй', () => {
    const { s, t } = inQuestion0();
    const a = onAnswer(s, A, 0, right(s, A, 0), t + 1000);
    expect(a.state.phase).toBe('question');
    expect(msgOf(a.out, 'answer_result', A)).toEqual({ type: 'answer_result', q: 0, choice: right(s, A, 0) });
    expect(msgOf(a.out, 'opponent_answered', B)).toEqual({ type: 'opponent_answered', q: 0, userId: A });
    expect(msgOf(a.out, 'reveal')).toBeUndefined();
  });

  it('тоглогч асуултад нэг л удаа хариулна', () => {
    const { s, t } = inQuestion0();
    const first = onAnswer(s, B, 0, wrong(s, B, 0), t + 500).state;
    const again = onAnswer(first, B, 0, right(s, B, 0), t + 600);
    expect(msgOf(again.out, 'error', B)?.code).toBe('ALREADY_ANSWERED');
  });

  it('хоёулаа хариулмагц reveal: хүн бүр өөрийн асуултын зөв хариултыг авна', () => {
    const { s, t } = inQuestion0();
    const s1 = onAnswer(s, A, 0, right(s, A, 0), t + 100).state;
    const r = onAnswer(s1, B, 0, wrong(s, B, 0), t + 200);
    expect(r.state.phase).toBe('reveal');
    const common = { q: 0, correct: [A], scores: { [A]: 1, [B]: 0 }, nextAt: t + 200 + REVEAL_MS };
    expect(msgOf(r.out, 'reveal', A)).toMatchObject({ ...common, correctIndex: right(s, A, 0), explanation: `E${A}.0` });
    expect(msgOf(r.out, 'reveal', B)).toMatchObject({ ...common, correctIndex: right(s, B, 0), explanation: `E${B}.0` });
  });

  it('30 сек дуусвал хариулаагүй байсан ч reveal', () => {
    const { s, t } = inQuestion0();
    const s1 = onAnswer(s, A, 0, right(s, A, 0), t + 1000).state;
    expect(onTick(s1, t + QUESTION_MS - 1).state.phase).toBe('question');
    const r = onTick(s1, t + QUESTION_MS);
    expect(r.state.phase).toBe('reveal');
    expect(msgOf(r.out, 'reveal', B)).toMatchObject({ correct: [A], scores: { [A]: 1, [B]: 0 } });
  });

  it('deadline өнгөрсний дараа (alarm-аас өмнө) ирсэн хариултыг хүлээж авахгүй', () => {
    const { s, t } = inQuestion0();
    const r = onAnswer(s, A, 0, right(s, A, 0), t + QUESTION_MS + 5);
    expect(msgOf(r.out, 'error', A)?.code).toBe('NOT_ACCEPTING');
    expect(r.state.scores[String(A)]).toBe(0);
  });

  it('reveal 2 сек → дараагийн асуулт', () => {
    const { s, t } = inQuestion0();
    const r = play(s, t, 0, []);
    expect(r.s.q).toBe(1);
    expect(msgOf(r.out, 'question', B)).toMatchObject({ q: 1, prompt: `Q${B}.1` });
  });
});

/** q асуултад good доторх тоглогчид зөв, бусад нь буруу хариулж, reveal-ийг дуусгана. */
function play(s: DuelState, t: number, q: number, good: number[]): { s: DuelState; t: number; out: Out[] } {
  let st = s;
  for (const id of [A, B]) st = onAnswer(st, id, q, good.includes(id) ? right(s, id, q) : wrong(s, id, q), t + 10).state;
  expect(onTick(st, t + 10 + REVEAL_MS - 1).state.phase).toBe('reveal');
  const r = onTick(st, t + 10 + REVEAL_MS);
  return { s: r.state, t: t + 10 + REVEAL_MS, out: r.out };
}

describe('үр дүн', () => {
  it('олон зөв хариулсан нь хожиж хоёр бооцоог авна', () => {
    let { s, t } = inQuestion0();
    ({ s, t } = play(s, t, 0, [A]));
    ({ s, t } = play(s, t, 1, [A, B]));
    const last = play(s, t, 2, []);
    expect(last.s.phase).toBe('finished');
    expect(last.s.outcome).toMatchObject({ winnerId: A, reason: 'score', scores: { [A]: 2, [B]: 1 }, deltas: { [A]: 10, [B]: -10 } });
    expect(last.s.settlement).toEqual({ kind: 'win', winners: [A], losers: [B] });
    expect(nextDeadline(last.s)).toBeNull();
  });

  it('тэнцвэл бооцоо буцна', () => {
    let { s, t } = inQuestion0();
    ({ s, t } = play(s, t, 0, [A]));
    ({ s, t } = play(s, t, 1, [B]));
    const last = play(s, t, 2, []);
    expect(last.s.outcome).toMatchObject({ winnerId: null, reason: 'draw', deltas: { [A]: 0, [B]: 0 } });
    expect(last.s.settlement).toEqual({ kind: 'refund' });
  });
});

describe('холболт', () => {
  it('30 сек дотор нөгөө тоглогч холбогдохгүй бол цуцалж бооцоог буцаана', () => {
    let s = createDuel(init, T0);
    s = onConnect(s, A, 'ca', T0 + 100).state;
    expect(nextDeadline(s)).toBe(T0 + CONNECT_TIMEOUT_MS);
    expect(onTick(s, T0 + CONNECT_TIMEOUT_MS - 1).state.phase).toBe('waiting');
    const r = onTick(s, T0 + CONNECT_TIMEOUT_MS);
    expect(r.state.phase).toBe('cancelled');
    expect(r.state.outcome?.reason).toBe('no_show');
    expect(r.state.settlement).toEqual({ kind: 'refund' });
  });

  it('тоглолтын дунд 10 секундээс удаан салсан тоглогч хожигдоно', () => {
    const { s, t } = inQuestion0();
    const d = onDisconnect(s, B, 'cb', t + 1000);
    expect(msgOf(d.out, 'presence', A)).toMatchObject({ userId: B, connected: false });
    expect(nextDeadline(d.state)).toBe(t + 1000 + DISCONNECT_GRACE_MS);
    const r = onTick(d.state, t + 1000 + DISCONNECT_GRACE_MS);
    expect(r.state.phase).toBe('finished');
    expect(r.state.outcome).toMatchObject({ winnerId: A, reason: 'forfeit', deltas: { [A]: 10, [B]: -10 } });
  });

  it('10 секундийн дотор эргэж холбогдвол үргэлжилж, одоогийн асуултыг snapshot-оор авна', () => {
    const { s, t } = inQuestion0();
    const d = onDisconnect(s, B, 'cb', t + 1000).state;
    const back = onConnect(d, B, 'cb2', t + 5000);
    expect(back.state.dropDeadline).toEqual({});
    const snap = msgOf(back.out, 'state', B);
    expect(snap).toMatchObject({ phase: 'question', question: { q: 0, prompt: `Q${B}.0` }, myAnswer: null });
    expect(onTick(back.state, t + 1000 + DISCONNECT_GRACE_MS).state.phase).toBe('question');
  });

  it('1 vs 1-д өрсөлдөгч түр салсан үед хариулт асуултыг хаахгүй, буцаж ирээд хариулж болно', () => {
    const { s, t } = inQuestion0();
    const d = onDisconnect(s, B, 'cb', t + 1000).state;
    const a = onAnswer(d, A, 0, wrong(s, A, 0), t + 1500);
    expect(a.state.phase).toBe('question');
    expect(msgOf(a.out, 'reveal')).toBeUndefined();
    const back = onConnect(a.state, B, 'cb2', t + 3000).state;
    const b = onAnswer(back, B, 0, right(s, B, 0), t + 3500);
    expect(msgOf(b.out, 'reveal', B)).toMatchObject({ correct: [B] });
  });

  it('шинэ холболтоор солигдсон хуучин socket хаагдахад тооцохгүй', () => {
    const { s, t } = inQuestion0();
    const replaced = onConnect(s, B, 'cb2', t + 100).state;
    const closedOld = onDisconnect(replaced, B, 'cb', t + 200);
    expect(closedOld.out).toEqual([]);
    expect(closedOld.state.conn[String(B)]).toBe('cb2');
  });

  it('хүлээх үед салж дахин холбогдвол тоглолт эхэлнэ', () => {
    let s = createDuel(init, T0);
    s = onConnect(s, A, 'ca', T0 + 100).state;
    s = onDisconnect(s, A, 'ca', T0 + 200).state;
    expect(s.dropDeadline).toEqual({});
    s = onConnect(s, B, 'cb', T0 + 300).state;
    expect(s.phase).toBe('waiting');
    s = onConnect(s, A, 'ca2', T0 + 400).state;
    expect(s.phase).toBe('countdown');
  });
});

describe('багийн тулаан (2 vs 2)', () => {
  const [A1, A2, B1, B2] = [11, 12, 21, 22];
  const team: DuelInit = {
    ...init,
    teamSize: 2,
    players: [
      { id: A1, username: 'a1', name: 'a1', avatar: {}, team: 'a' },
      { id: A2, username: 'a2', name: 'a2', avatar: {}, team: 'a' },
      { id: B1, username: 'b1', name: 'b1', avatar: {}, team: 'b' },
      { id: B2, username: 'b2', name: 'b2', avatar: {}, team: 'b' },
    ],
    questions: deal([A1, A2, B1, B2]),
  };
  const ALL = [A1, A2, B1, B2];

  function teamQuestion0(ids = ALL): { s: DuelState; t: number } {
    let s = createDuel(team, T0);
    ids.forEach((id, i) => {
      s = onConnect(s, id, `c${id}`, T0 + 100 + i).state;
    });
    // Бүгд ирвэл сүүлчийнх нь холбогдмогц, үгүй бол холбогдох хугацаа дуусахад countdown эхэлнэ.
    const countdownAt = ids.length === ALL.length ? T0 + 100 + ids.length - 1 : T0 + CONNECT_TIMEOUT_MS;
    if (ids.length !== ALL.length) s = onTick(s, countdownAt).state;
    const t = countdownAt + COUNTDOWN_MS;
    s = onTick(s, t).state;
    return { s, t };
  }

  it('бүгд холбогдмогц эхэлнэ; snapshot тоглогч бүрийн багийг агуулна', () => {
    let s = createDuel(team, T0);
    for (const id of ALL.slice(0, 3)) s = onConnect(s, id, `c${id}`, T0 + 100).state;
    expect(s.phase).toBe('waiting');
    const last = onConnect(s, B2, 'cB2', T0 + 200);
    expect(last.state.phase).toBe('countdown');
    const snap = msgOf(last.out, 'state', B2);
    expect(snap).toMatchObject({ teamSize: 2 });
    expect(snap?.type === 'state' && snap.players.map((p) => p.team)).toEqual(['a', 'a', 'b', 'b']);
  });

  it('зөв хариулт бүр багтаа оноо; бүгд хариулмагц reveal', () => {
    const { s, t } = teamQuestion0();
    let st = onAnswer(s, A1, 0, right(s, A1, 0), t + 10).state;
    expect(st.phase).toBe('question');
    st = onAnswer(st, B1, 0, right(s, B1, 0), t + 20).state;
    st = onAnswer(st, A2, 0, right(s, A2, 0), t + 30).state;
    const r = onAnswer(st, B2, 0, wrong(s, B2, 0), t + 40);
    for (const id of ALL) expect(msgOf(r.out, 'reveal', id)).toMatchObject({ correct: [A1, A2, B1], teamScores: { a: 2, b: 1 }, correctIndex: right(s, id, 0) });
  });

  it('хариулаагүй сүүлчийн гишүүн салбал хугацаа хүлээлгүй reveal', () => {
    const { s, t } = teamQuestion0();
    let st = onAnswer(s, A1, 0, right(s, A1, 0), t + 10).state;
    st = onAnswer(st, A2, 0, wrong(s, A2, 0), t + 20).state;
    st = onAnswer(st, B1, 0, right(s, B1, 0), t + 30).state;
    const r = onDisconnect(st, B2, 'c22', t + 40);
    expect(msgOf(r.out, 'reveal', A1)).toMatchObject({ q: 0, correct: [A1, B1] });
  });

  it('оноо их баг хожиж, гишүүн бүр бооцоо авна', () => {
    let { s, t } = teamQuestion0();
    for (let q = 0; q < 3; q++) {
      s = onAnswer(s, A1, q, right(s, A1, q), t + 10).state;
      s = onAnswer(s, A2, q, wrong(s, A2, q), t + 20).state;
      s = onAnswer(s, B1, q, wrong(s, B1, q), t + 30).state;
      s = onAnswer(s, B2, q, wrong(s, B2, q), t + 40).state;
      t += 40 + REVEAL_MS;
      s = onTick(s, t).state;
    }
    expect(s.phase).toBe('finished');
    expect(s.outcome).toMatchObject({ winnerId: null, winnerTeam: 'a', teamScores: { a: 3, b: 0 }, deltas: { [A1]: 10, [A2]: 10, [B1]: -10, [B2]: -10 } });
    expect(s.settlement).toEqual({ kind: 'win', winners: [A1, A2], losers: [B1, B2] });
  });

  it('хоёр багаас хүн ирсэн бол ирээгүйг хүлээлгүй эхэлж, салсан тоглогчийг хүлээхгүй', () => {
    const { s, t } = teamQuestion0([A1, B1, B2]);
    expect(s.phase).toBe('question');
    let st = onAnswer(s, A1, 0, 1, t + 10).state;
    st = onAnswer(st, B1, 0, 1, t + 20).state;
    const r = onAnswer(st, B2, 0, 1, t + 30);
    expect(r.state.phase).toBe('reveal');
  });

  it('нэг багаас хэн ч ирээгүй бол цуцлана', () => {
    let s = createDuel(team, T0);
    s = onConnect(s, A1, 'cA1', T0 + 100).state;
    s = onConnect(s, A2, 'cA2', T0 + 100).state;
    expect(onTick(s, T0 + CONNECT_TIMEOUT_MS).state.outcome?.reason).toBe('no_show');
  });

  it('нэг гишүүн салбал тоглолт үргэлжилнэ; баг бүхэлдээ салбал хожигдоно', () => {
    const { s, t } = teamQuestion0();
    let st = onDisconnect(s, B1, 'c21', t + 100).state;
    st = onTick(st, t + 100 + DISCONNECT_GRACE_MS).state;
    expect(st.phase).toBe('question');
    st = onDisconnect(st, B2, 'c22', t + 200).state;
    const r = onTick(st, t + 200 + DISCONNECT_GRACE_MS);
    expect(r.state.outcome).toMatchObject({ winnerTeam: 'a', reason: 'forfeit' });
  });
});
