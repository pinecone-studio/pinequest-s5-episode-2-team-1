import { describe, expect, it } from 'vitest';
import type { ServerMsg } from '../../shared/types';
import { GAME } from '../src/config/game';
import { createDuel, type DuelInit, type DuelState, nextDeadline, onAnswer, onConnect, onDisconnect, onTick, type Out, snapshot } from '../src/duel/engine';

const { QUESTION_MS, REVEAL_MS, COUNTDOWN_MS, CONNECT_TIMEOUT_MS, DISCONNECT_GRACE_MS } = GAME.DUEL;
const A = 1;
const B = 2;
const T0 = 1_000_000;

const init: DuelInit = {
  duelId: 7,
  subject: 'math',
  stake: 10,
  players: [
    { id: A, username: 'aa', avatar: {} },
    { id: B, username: 'bb', avatar: {} },
  ],
  // асуулт i-ийн зөв хариулт = i
  questions: [0, 1, 2].map((i) => ({ id: 100 + i, prompt: `Q${i}`, options: ['а', 'б', 'в', 'г'], correctIndex: i, explanation: `E${i}` })),
};

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
  it('хоёулаа холбогдмогц 3 сек countdown, дараа нь асуулт хоёуланд зэрэг', () => {
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
    const question = msgOf(q.out, 'question', 'all');
    expect(question).toMatchObject({ q: 0, total: 3, prompt: 'Q0', endsAt: T0 + 200 + COUNTDOWN_MS + QUESTION_MS });
    expect(JSON.stringify(question)).not.toMatch(/correctIndex|explanation/);
  });

  it('snapshot асуултын үед зөв хариултыг агуулахгүй', () => {
    const { s, t } = inQuestion0();
    expect(JSON.stringify(snapshot(s, A, t))).not.toMatch(/correctIndex|"E0"/);
  });
});

describe('асуултын дүрэм', () => {
  it('хамгийн түрүүнд зөв хариулсан нь авна; дараагийнх нь хүлээж авагдахгүй', () => {
    const { s, t } = inQuestion0();
    const a = onAnswer(s, A, 0, 0, t + 1000);
    expect(msgOf(a.out, 'answer_result', A)?.correct).toBe(true);
    expect(msgOf(a.out, 'opponent_answered', B)?.correct).toBe(true);
    const reveal = msgOf(a.out, 'reveal', 'all');
    expect(reveal).toMatchObject({ q: 0, correctIndex: 0, winnerId: A, scores: { [A]: 1, [B]: 0 }, nextAt: t + 1000 + REVEAL_MS });
    const late = onAnswer(a.state, B, 0, 0, t + 1001);
    expect(msgOf(late.out, 'error', B)?.code).toBe('NOT_ACCEPTING');
    expect(late.state.scores[String(B)]).toBe(0);
  });

  it('буруу хариулсан тоглогч тэр асуултад дахин хариулахгүй, өрсөлдөгч нь авч болно', () => {
    const { s, t } = inQuestion0();
    const wrong = onAnswer(s, B, 0, 3, t + 500);
    expect(msgOf(wrong.out, 'answer_result', B)?.correct).toBe(false);
    expect(msgOf(wrong.out, 'opponent_answered', A)?.correct).toBe(false);
    expect(wrong.state.phase).toBe('question');
    const again = onAnswer(wrong.state, B, 0, 0, t + 600);
    expect(msgOf(again.out, 'error', B)?.code).toBe('ALREADY_ANSWERED');
    const win = onAnswer(again.state, A, 0, 0, t + 700);
    expect(msgOf(win.out, 'reveal', 'all')?.winnerId).toBe(A);
  });

  it('хоёулаа буруу бол хугацаа хүлээлгүй reveal, хэн ч авахгүй', () => {
    const { s, t } = inQuestion0();
    const s1 = onAnswer(s, A, 0, 1, t + 100).state;
    const r = onAnswer(s1, B, 0, 2, t + 200);
    expect(r.state.phase).toBe('reveal');
    expect(msgOf(r.out, 'reveal', 'all')).toMatchObject({ winnerId: null, scores: { [A]: 0, [B]: 0 } });
  });

  it('20 сек дуусвал хэн ч авахгүй', () => {
    const { s, t } = inQuestion0();
    const r = onTick(s, t + QUESTION_MS);
    expect(r.state.phase).toBe('reveal');
    expect(msgOf(r.out, 'reveal', 'all')?.winnerId).toBeNull();
  });

  it('deadline өнгөрсний дараа (alarm-аас өмнө) ирсэн хариултыг хүлээж авахгүй', () => {
    const { s, t } = inQuestion0();
    const r = onAnswer(s, A, 0, 0, t + QUESTION_MS + 5);
    expect(msgOf(r.out, 'error', A)?.code).toBe('NOT_ACCEPTING');
    expect(r.state.scores[String(A)]).toBe(0);
  });

  it('reveal 2 сек → дараагийн асуулт', () => {
    const { s, t } = inQuestion0();
    const r = onAnswer(s, A, 0, 0, t + 1000);
    expect(onTick(r.state, t + 1000 + REVEAL_MS - 1).state.phase).toBe('reveal');
    const next = onTick(r.state, t + 1000 + REVEAL_MS);
    expect(next.state.q).toBe(1);
    expect(msgOf(next.out, 'question', 'all')?.q).toBe(1);
  });
});

/** q асуултад winner (null бол хоёулаа буруу) хариулж, reveal-ийг дуусгана. */
function play(s: DuelState, t: number, q: number, winner: number | null): { s: DuelState; t: number; out: Out[] } {
  let st = s;
  if (winner === null) {
    st = onAnswer(st, A, q, (q + 1) % 4, t + 10).state;
    st = onAnswer(st, B, q, (q + 1) % 4, t + 20).state;
  } else {
    st = onAnswer(st, winner, q, q, t + 10).state;
  }
  const r = onTick(st, t + 20 + REVEAL_MS);
  return { s: r.state, t: t + 20 + REVEAL_MS, out: r.out };
}

describe('үр дүн', () => {
  it('олон асуулт авсан нь хожиж хоёр бооцоог авна', () => {
    let { s, t } = inQuestion0();
    ({ s, t } = play(s, t, 0, A));
    ({ s, t } = play(s, t, 1, B));
    const last = play(s, t, 2, A);
    expect(last.s.phase).toBe('finished');
    expect(last.s.outcome).toMatchObject({ winnerId: A, reason: 'score', scores: { [A]: 2, [B]: 1 }, deltas: { [A]: 10, [B]: -10 } });
    expect(last.s.settlement).toEqual({ kind: 'win', winnerId: A, loserId: B });
    expect(nextDeadline(last.s)).toBeNull();
  });

  it('тэнцвэл бооцоо буцна', () => {
    let { s, t } = inQuestion0();
    ({ s, t } = play(s, t, 0, A));
    ({ s, t } = play(s, t, 1, B));
    const last = play(s, t, 2, null);
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
    expect(snap).toMatchObject({ phase: 'question', question: { q: 0 }, myAnswer: null });
    expect(onTick(back.state, t + 1000 + DISCONNECT_GRACE_MS).state.phase).toBe('question');
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
