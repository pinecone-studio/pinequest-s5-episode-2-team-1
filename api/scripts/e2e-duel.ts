import type { AuthResponse, DuelResponse, LobbyResponse } from '../../shared/types';
import { call, flag, sleep } from './lib';
import { check, correctIndex, doTask, expectError, me, register, WsPlayer } from './e2e-lib';

async function createAndAccept(creator: AuthResponse, acceptor: AuthResponse, stake: number) {
  const { duel } = await call<DuelResponse>('POST', '/duels', { token: creator.token, body: { subject: 'math', stake } });
  await call<DuelResponse>('POST', `/duels/${duel.id}/accept`, { token: acceptor.token });
  return duel.id;
}

/** Хоёулаа холбогдож эхний асуулт хүртэл хүлээнэ. */
async function connectBoth(duelId: number, a: AuthResponse, b: AuthResponse) {
  const pb = await WsPlayer.open('B', duelId, b.token);
  const pa = await WsPlayer.open('A', duelId, a.token);
  await pa.waitFor('countdown', 5_000);
  await pb.waitFor('countdown', 5_000);
  return { pa, pb };
}

async function limitsAndEscrow() {
  console.log('\n— Тулаан: лобби, бооцооны хязгаар, escrow');
  const a = await register('duel_a', 7);
  const b = await register('duel_b', 6);
  const x = await register('duel_x', 10);

  await expectError(
    call('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 11 } }),
    'STAKE_TOO_HIGH',
    'Онооны 20%-иас их бооцоо (50 → 11) зөвшөөрөхгүй',
  );
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 0 } }), 'STAKE_TOO_LOW', 'Бооцоо 1-ээс бага болохгүй');
  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 10 } });
  check(duel.status === 'open' && duel.stake === 10, 'Математикаар 10 онооны сорилт үүслээ');
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'physics', stake: 5 } }), 'DUEL_EXISTS', 'Хоёр дахь нээлттэй сорилт үүсгэхгүй');

  const lobbyB = await call<LobbyResponse>('GET', '/duels', { token: b.token });
  check(lobbyB.open.some((d) => d.id === duel.id) && lobbyB.maxStake === 10, 'Түвшин 1-ийн Б лобби дээр харна, дээд бооцоо 10');
  const lobbyX = await call<LobbyResponse>('GET', '/duels', { token: x.token });
  check(!lobbyX.open.some((d) => d.id === duel.id), 'Түвшин 3-ын хэрэглэгч харахгүй');
  await expectError(call('POST', `/duels/${duel.id}/accept`, { token: x.token }), 'WRONG_TIER', 'Өөр түвшний сорилтыг хүлээн авахгүй');
  await expectError(call('POST', `/duels/${duel.id}/accept`, { token: a.token }), 'OWN_DUEL', 'Өөрийн сорилтыг хүлээн авахгүй');

  await call('POST', `/duels/${duel.id}/accept`, { token: b.token });
  const [ma, mb] = [await me(a.token), await me(b.token)];
  check(ma.points === 40 && mb.points === 40, 'Хүлээн авмагц хоёулангийнх нь бооцоо түр хасагдана (50 → 40)', [ma.points, mb.points]);
  const c = await register('duel_c', 7);
  await expectError(call('POST', `/duels/${duel.id}/accept`, { token: c.token }), 'DUEL_TAKEN', 'Хүлээн авсан сорилтыг өөр хүн авахгүй');
  const mineA = await call<LobbyResponse>('GET', '/duels', { token: a.token });
  check(mineA.mine?.id === duel.id && mineA.mine.status === 'accepted', 'Үүсгэгч лобби poll-оор хүлээн авсныг мэдэнэ');

  // Хүлээн авагчийн онооны 20%-ийг бас шалгана.
  const rich = await register('duel_rich', 7);
  await doTask(rich.token, 'physics', true); // 50 → 100
  const { duel: big } = await call<DuelResponse>('POST', '/duels', { token: rich.token, body: { subject: 'math', stake: 20 } });
  await expectError(call('POST', `/duels/${big.id}/accept`, { token: c.token }), 'STAKE_TOO_HIGH', 'Хүлээн авагчийн онооны 20%-иас их бол хүлээн авахгүй');
  await call('POST', `/duels/${big.id}/cancel`, { token: rich.token });
  check((await me(rich.token)).points === 100, 'Нээлттэй сорилтыг цуцлахад оноо хөдлөхгүй');

  return { a, b, duelId: duel.id };
}

async function fullDuel(a: AuthResponse, b: AuthResponse, duelId: number) {
  console.log('\n— Тулаан: real-time 3 асуулт (A хожно)');
  const rejected = await WsPlayer.open('X', duelId, 'bad-token').then((p) => (p.close(), false), () => true);
  check(rejected, 'Буруу token-той WebSocket холбогдохгүй');
  const { pa, pb } = await connectBoth(duelId, a, b);

  // Асуулт 1: Б буруу → түгжигдэнэ; А зөв → авна
  const q1 = await pa.waitFor('question', 6_000);
  await pb.waitFor('question', 1_000);
  check(!('correctIndex' in q1) && q1.total === 3, 'Асуулт хоёуланд зэрэг, зөв хариултгүй ирнэ');
  const c1 = await correctIndex(q1.questionId);
  pb.answer(q1.q, (c1 + 1) % 4);
  const wrong = await pb.waitFor('answer_result');
  check(!wrong.correct, 'Б буруу хариулсан');
  check((await pa.waitFor('opponent_answered')).correct === false, 'А-д өрсөлдөгч буруу хариулсныг мэдэгдэнэ');
  pb.answer(q1.q, c1);
  check((await pb.waitFor('error')).code === 'ALREADY_ANSWERED', 'Буруу хариулсан тоглогч дахин хариулахгүй');
  pa.answer(q1.q, c1);
  const r1 = await pa.waitFor('reveal', 3_000, (m) => m.q === q1.q);
  check(r1.winnerId === a.me.id && r1.correctIndex === c1, 'А асуултыг авлаа, зөв хариу харагдана');
  await pb.waitFor('reveal', 3_000, (m) => m.q === q1.q);

  // Асуулт 2: хоёулаа зөв, А түрүүлнэ
  const q2 = await pa.waitFor('question', 5_000);
  await pb.waitFor('question', 1_000);
  const c2 = await correctIndex(q2.questionId);
  pa.answer(q2.q, c2);
  await sleep(30);
  pb.answer(q2.q, c2);
  const r2 = await pb.waitFor('reveal', 3_000, (m) => m.q === q2.q);
  await pa.waitFor('reveal', 3_000, (m) => m.q === q2.q);
  check(r2.winnerId === a.me.id, 'Түрүүлж ирсэн зөв хариулт (сервер хүлээн авсан дарааллаар) авна');
  check((await pb.waitFor('error')).code === 'NOT_ACCEPTING', 'Хоцорсон хариулт хүлээж авагдахгүй');

  // Асуулт 3: хоёулаа буруу → хэн ч авахгүй
  const q3 = await pa.waitFor('question', 5_000);
  const c3 = await correctIndex(q3.questionId);
  pa.answer(q3.q, (c3 + 1) % 4);
  pb.answer(q3.q, (c3 + 2) % 4);
  const r3 = await pa.waitFor('reveal', 3_000, (m) => m.q === q3.q);
  check(r3.winnerId === null, 'Хоёулаа буруу бол хэн ч авахгүй', r3);

  const [fa, fb] = await Promise.all([pa.waitFor('finished', 6_000), pb.waitFor('finished', 6_000)]);
  check(fa.outcome.winnerId === a.me.id && fa.outcome.reason === 'score', 'А 2:0-ээр хожлоо', fa.outcome);
  check(fa.outcome.deltas[a.me.id] === 10 && fa.outcome.deltas[b.me.id] === -10, 'Ялагч +10, ялагдагч −10');
  check(fa.outcome.points[a.me.id] === 60 && fa.outcome.points[b.me.id] === 40, 'Шинэ оноо хоёуланд зэрэг ирнэ (60 / 40)', fa.outcome.points);
  check(JSON.stringify(fa.outcome) === JSON.stringify(fb.outcome), 'Хоёр утсан дээр ижил үр дүн');
  check((await me(a.token)).points === 60 && (await me(b.token)).points === 40, 'D1 дээр оноо шинэчлэгдсэн');
  pa.close();
  pb.close();
}

async function drawDuel() {
  console.log('\n— Тулаан: тэнцээ');
  const a = await register('draw_a', 6);
  const b = await register('draw_b', 7);
  const duelId = await createAndAccept(a, b, 5);
  const { pa, pb } = await connectBoth(duelId, a, b);
  for (let i = 0; i < 3; i++) {
    const q = await pa.waitFor('question', 6_000);
    const ci = await correctIndex(q.questionId);
    pa.answer(q.q, (ci + 1) % 4);
    pb.answer(q.q, (ci + 2) % 4);
    await pa.waitFor('reveal');
  }
  const f = await pb.waitFor('finished', 6_000);
  check(f.outcome.reason === 'draw' && f.outcome.winnerId === null, 'Тэнцлээ');
  check(f.outcome.points[a.me.id] === 50 && f.outcome.points[b.me.id] === 50, 'Тэнцвэл бооцоо буцна (50 / 50)', f.outcome.points);
  pa.close();
  pb.close();
}

async function forfeitDuel() {
  console.log('\n— Тулаан: 10 секундээс удаан салсан тоглогч хожигдоно');
  const a = await register('ff_a', 7);
  const b = await register('ff_b', 7);
  const duelId = await createAndAccept(a, b, 4);
  const { pa, pb } = await connectBoth(duelId, a, b);
  await pa.waitFor('question', 6_000);
  pb.close();
  const presence = await pa.waitFor('presence', 3_000, (m) => !m.connected);
  check(presence.userId === b.me.id, 'А-д өрсөлдөгч салсныг мэдэгдэнэ');
  const started = Date.now();
  const f = await pa.waitFor('finished', 15_000);
  const waited = Date.now() - started;
  check(f.outcome.reason === 'forfeit' && f.outcome.winnerId === a.me.id, 'Салсан Б хожигдлоо');
  check(waited >= 9_000 && waited <= 13_000, `~10 секундийн дараа (${(waited / 1000).toFixed(1)} сек)`);
  check(f.outcome.points[a.me.id] === 54 && f.outcome.points[b.me.id] === 46, 'Оноо 54 / 46', f.outcome.points);
  pa.close();
}

async function noShowDuel() {
  console.log('\n— Тулаан: 30 секундэд холбогдоогүй бол цуцалж буцаана (--slow)');
  const a = await register('ns_a', 7);
  const b = await register('ns_b', 7);
  const duelId = await createAndAccept(a, b, 3);
  const pb = await WsPlayer.open('B', duelId, b.token);
  const c = await pb.waitFor('cancelled', 40_000);
  check(c.outcome.reason === 'no_show', 'Цуцлагдлаа (no_show)');
  check(c.outcome.points[a.me.id] === 50 && c.outcome.points[b.me.id] === 50, 'Бооцоо буцлаа', c.outcome.points);
  pb.close();
}

export async function runDuelScenario(): Promise<void> {
  const { a, b, duelId } = await limitsAndEscrow();
  await fullDuel(a, b, duelId);
  await drawDuel();
  await forfeitDuel();
  if (flag('slow')) await noShowDuel();
}
