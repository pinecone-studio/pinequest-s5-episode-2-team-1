import type { AuthResponse } from '../../shared/types';
import { flag } from './lib';
import { check, connectBoth, correctIndex, createAndAccept, me, register, WsPlayer } from './e2e-lib';
import { inviteCode, limitsAndEscrow, lobbyPresence } from './e2e-duel-lobby';
import { teamDuel } from './e2e-duel-team';

async function fullDuel(a: AuthResponse, b: AuthResponse, duelId: number) {
  console.log('\n— Тулаан: real-time 3 асуулт (A хожно)');
  const rejected = await WsPlayer.open('X', duelId, 'bad-token').then((p) => (p.close(), false), () => true);
  check(rejected, 'Буруу token-той WebSocket холбогдохгүй');
  const { pa, pb } = await connectBoth(duelId, a, b);

  // Асуулт 1: хүн бүр өөр асуулттай; Б буруу, А зөв. Зөв эсэхийг хоёулаа хариултал хэлэхгүй.
  const [q1, qb1] = await Promise.all([pa.waitFor('question', 6_000), pb.waitFor('question', 6_000)]);
  check(!('correctIndex' in q1) && q1.total === 3 && q1.questionId !== qb1.questionId, 'Хүн бүрт өөр асуулт, зөв хариултгүй ирнэ');
  const [c1, cb1] = await Promise.all([correctIndex(q1.questionId), correctIndex(qb1.questionId)]);
  pb.answer(qb1.q, (cb1 + 1) % 4);
  check(!('correct' in (await pb.waitFor('answer_result'))), 'Б-д зөв эсэхийг хэлэхгүй');
  check(!('correct' in (await pa.waitFor('opponent_answered'))), 'А-д өрсөлдөгч хариулсныг л мэдэгдэнэ');
  pb.answer(qb1.q, cb1);
  check((await pb.waitFor('error')).code === 'ALREADY_ANSWERED', 'Хариулсан тоглогч дахин хариулахгүй');
  pa.answer(q1.q, c1);
  const r1 = await pa.waitFor('reveal', 3_000, (m) => m.q === q1.q);
  check(r1.correctIndex === c1 && r1.correct.join() === String(a.me.id), 'Хоёулаа хариулмагц reveal: А зөв, өөрийн асуултын зөв хариу харагдана');
  check((await pb.waitFor('reveal', 3_000, (m) => m.q === q1.q)).correctIndex === cb1, 'Б өөрийн асуултын зөв хариуг харна');

  // Асуулт 2: А зөв, Б буруу
  const [q2, qb2] = await Promise.all([pa.waitFor('question', 5_000), pb.waitFor('question', 5_000)]);
  pa.answer(q2.q, await correctIndex(q2.questionId));
  pb.answer(qb2.q, ((await correctIndex(qb2.questionId)) + 1) % 4);
  await pa.waitFor('reveal', 3_000, (m) => m.q === q2.q);
  pa.answer(q2.q, 0);
  check((await pa.waitFor('error')).code === 'NOT_ACCEPTING', 'Reveal-ийн дараах хариулт хүлээж авагдахгүй');

  // Асуулт 3: хоёулаа буруу
  const [q3, qb3] = await Promise.all([pa.waitFor('question', 5_000), pb.waitFor('question', 5_000)]);
  pa.answer(q3.q, ((await correctIndex(q3.questionId)) + 1) % 4);
  pb.answer(qb3.q, ((await correctIndex(qb3.questionId)) + 1) % 4);
  const r3 = await pa.waitFor('reveal', 3_000, (m) => m.q === q3.q);
  check(r3.correct.length === 0, 'Хоёулаа буруу бол хэн ч оноо авахгүй', r3);

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
  const a = await register('draw_a', 7);
  const b = await register('draw_b', 7);
  const duelId = await createAndAccept(a, b, 5);
  const { pa, pb } = await connectBoth(duelId, a, b);
  for (let i = 0; i < 3; i++) {
    const [qa, qb] = await Promise.all([pa.waitFor('question', 6_000), pb.waitFor('question', 6_000)]);
    pa.answer(qa.q, ((await correctIndex(qa.questionId)) + 1) % 4);
    pb.answer(qb.q, ((await correctIndex(qb.questionId)) + 1) % 4);
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
  await inviteCode();
  await teamDuel();
  if (flag('slow')) {
    await noShowDuel();
    await lobbyPresence();
  }
}
