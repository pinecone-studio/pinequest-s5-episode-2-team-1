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
  const b = await register('duel_b', 7);
  const x = await register('duel_x', 6);

  await expectError(
    call('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 11 } }),
    'STAKE_TOO_HIGH',
    'Онооны 20%-иас их бооцоо (50 → 11) зөвшөөрөхгүй',
  );
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 0 } }), 'STAKE_TOO_LOW', 'Бооцоо 1-ээс бага болохгүй');
  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 10 } });
  check(duel.status === 'open' && duel.stake === 10, 'Математикаар 10 онооны сорилт үүслээ');
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'physics', stake: 5 } }), 'BAD_REQUEST', 'Физикээр тулаан үүсгэхгүй');
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'mongolian', stake: 5 } }), 'BAD_REQUEST', 'Монгол хэлээр тулаан үүсгэхгүй');
  await expectError(call('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 5 } }), 'DUEL_EXISTS', 'Хоёр дахь нээлттэй сорилт үүсгэхгүй');

  const lobbyB = await call<LobbyResponse>('GET', '/duels', { token: b.token });
  check(lobbyB.open.some((d) => d.id === duel.id) && lobbyB.maxStake === 10, 'Ижил ангийн Б лобби дээр харна, дээд бооцоо 10');
  const lobbyX = await call<LobbyResponse>('GET', '/duels', { token: x.token });
  check(!lobbyX.open.some((d) => d.id === duel.id), 'Өөр ангийн (6-р) хэрэглэгч харахгүй');
  await expectError(call('POST', `/duels/${duel.id}/accept`, { token: x.token }), 'WRONG_GRADE', 'Өөр ангийн сорилтыг хүлээн авахгүй');
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
  await doTask(rich.token, 'mongolian', true); // 50 → 100
  const { duel: big } = await call<DuelResponse>('POST', '/duels', { token: rich.token, body: { subject: 'math', stake: 20 } });
  await expectError(call('POST', `/duels/${big.id}/accept`, { token: c.token }), 'STAKE_TOO_HIGH', 'Хүлээн авагчийн онооны 20%-иас их бол хүлээн авахгүй');
  await call('POST', `/duels/${big.id}/cancel`, { token: rich.token });
  check((await me(rich.token)).points === 100, 'Нээлттэй сорилтыг цуцлахад оноо хөдлөхгүй');

  return { a, b, duelId: duel.id };
}

async function inviteCode() {
  console.log('\n— Тулаан: урилгын код, найзын (private) сорилт');
  const a = await register('code_a', 7);
  const b = await register('code_b', 7);
  const x = await register('code_x', 6);

  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 3, visibility: 'private' } });
  check(duel.visibility === 'private' && /^\d{6}$/.test(duel.code ?? ''), 'Найзын сорилт 6 оронтой кодтой үүслээ', duel.code);
  const code = duel.code!;
  const lobbyB = await call<LobbyResponse>('GET', '/duels', { token: b.token });
  check(!lobbyB.open.some((d) => d.id === duel.id), 'Найзын сорилт лобби дээр гарахгүй');
  const seen = await call<DuelResponse>('GET', `/duels/${duel.id}`, { token: b.token });
  check(seen.duel.code === null, 'Кодыг зөвхөн үүсгэгч харна');
  await expectError(call('POST', `/duels/${duel.id}/accept`, { token: b.token }), 'NOT_FOUND', 'Найзын сорилтыг id-аар хүлээн авахгүй');
  await expectError(call('POST', '/duels/join', { token: b.token, body: { code: '12' } }), 'BAD_REQUEST', 'Буруу урттай код');
  await expectError(call('POST', '/duels/join', { token: x.token, body: { code } }), 'WRONG_GRADE', 'Өөр ангийн хүүхэд кодоор ч орохгүй');
  await expectError(call('POST', '/duels/join', { token: a.token, body: { code } }), 'OWN_DUEL', 'Өөрийн кодоор орохгүй');

  // Б өөрийн нээлттэй сорилттой байсан ч кодоор орж болно: Б-гийн сорилт хаагдана.
  const { duel: own } = await call<DuelResponse>('POST', '/duels', { token: b.token, body: { subject: 'math', stake: 2 } });
  const joined = await call<DuelResponse>('POST', '/duels/join', { token: b.token, body: { code: `${code.slice(0, 3)} ${code.slice(3)}` } });
  check(joined.duel.id === duel.id && joined.duel.status === 'accepted', 'Б кодоор (зайтай бичсэн ч) орлоо');
  const ownAfter = await call<DuelResponse>('GET', `/duels/${own.id}`, { token: b.token });
  check(ownAfter.duel.status === 'cancelled', 'Б-гийн өөрийн нээлттэй сорилт хаагдлаа');
  const [ma, mb] = [await me(a.token), await me(b.token)];
  check(ma.points === 47 && mb.points === 47, 'Хоёулангийнх нь бооцоо түр хасагдлаа (50 → 47)', [ma.points, mb.points]);
  const mineA = await call<LobbyResponse>('GET', '/duels', { token: a.token });
  check(mineA.mine?.id === duel.id && mineA.mine.status === 'accepted', 'Үүсгэгч лобби poll-оор эхэлснийг мэдэнэ');
  const c = await register('code_c', 7);
  await expectError(call('POST', '/duels/join', { token: c.token, body: { code } }), 'CODE_NOT_FOUND', 'Эхэлсэн тулааны кодоор дахин орохгүй');

  // Лобби дээрх (public) сорилт ч кодтой: найзаа кодоор урьж болно.
  const { duel: pub } = await call<DuelResponse>('POST', '/duels', { token: c.token, body: { subject: 'math', stake: 2 } });
  const d = await register('code_d', 7);
  const lobbyD = await call<LobbyResponse>('GET', '/duels', { token: d.token });
  const listed = lobbyD.open.find((o) => o.id === pub.id);
  check(pub.visibility === 'public' && !!listed && listed.code === null, 'Нээлттэй сорилт лобби дээр кодгүйгээр харагдана');
  await call('POST', `/duels/${pub.id}/cancel`, { token: c.token });
  await expectError(call('POST', '/duels/join', { token: d.token, body: { code: pub.code } }), 'CODE_NOT_FOUND', 'Цуцалсан сорилтын код ажиллахгүй');

  const { pa, pb } = await connectBoth(duel.id, a, b);
  check(true, 'Кодоор орсон тулаан эхэллээ (3-2-1)');
  pa.close();
  pb.close();
}

/** Үүсгэгч лобби-гоо LOBBY_PRESENCE_MS (15 сек) нээгээгүй бол сорилт нь бусдад харагдахгүй (--slow). */
async function lobbyPresence() {
  console.log('\n— Тулаан: үүсгэгч алга бол сорилт лобби дээрээс нуугдана (--slow)');
  const a = await register('pres_a', 7);
  const b = await register('pres_b', 7);
  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 1 } });
  const listed = async () => (await call<LobbyResponse>('GET', '/duels', { token: b.token })).open.some((d) => d.id === duel.id);
  check(await listed(), 'Үүсгэмэгц харагдана');
  await sleep(16_000);
  check(!(await listed()), '16 сек poll хийгээгүй бол харагдахгүй');
  await call('GET', '/duels', { token: a.token });
  check(await listed(), 'Үүсгэгч лобби-гоо нээмэгц дахин харагдана');
  await call('POST', `/duels/${duel.id}/cancel`, { token: a.token });
}

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

/** 2 vs 2: кодоор баг бүрдүүлж, баг солиод, дүүрмэгц эхэлнэ; зөв хариулт бүр багтаа оноо. */
async function teamDuel() {
  console.log('\n— Тулаан: 2 vs 2 багийн тулаан');
  const [a1, a2, b1, b2, x] = await Promise.all(['t_a1', 't_a2', 't_b1', 't_b2', 't_x'].map((n) => register(n, 7)));
  await expectError(
    call('POST', '/duels', { token: a1.token, body: { subject: 'math', stake: 5, teamSize: 6 } }),
    'BAD_REQUEST',
    'Багийн хэмжээ 5-аас их болохгүй',
  );
  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a1.token, body: { subject: 'math', stake: 5, visibility: 'private', teamSize: 2 } });
  check(duel.teamSize === 2 && duel.members.length === 1 && duel.myTeam === 'a' && !!duel.code, '2 vs 2 сорилт үүсч, үүсгэгч А багт', duel);
  const code = duel.code!;

  const j1 = await call<DuelResponse>('POST', '/duels/join', { token: b1.token, body: { code } });
  check(j1.duel.myTeam === 'b' && j1.duel.status === 'open' && j1.duel.code === code, 'Эхний нэгдэгч цөөн хүнтэй (Б) баг руу орж, кодыг харна');
  const j2 = await call<DuelResponse>('POST', '/duels/join', { token: a2.token, body: { code, team: 'b' } });
  check(j2.duel.myTeam === 'b', 'Сонгосон баг руугаа орно');
  await expectError(call('POST', '/duels/join', { token: x.token, body: { code, team: 'b' } }), 'TEAM_FULL', 'Дүүрсэн баг руу орохгүй');
  const sw = await call<DuelResponse>('POST', `/duels/${duel.id}/team`, { token: a2.token, body: { team: 'a' } });
  check(sw.duel.myTeam === 'a', 'Нөгөө баг руу шилжинэ');
  await call('POST', `/duels/${duel.id}/leave`, { token: b1.token });
  const left = await call<DuelResponse>('GET', `/duels/${duel.id}`, { token: a1.token });
  check(left.duel.members.length === 2 && !left.duel.members.some((m) => m.id === b1.me.id), 'Гишүүн багаас гарч болно');
  await expectError(call('POST', `/duels/${duel.id}/leave`, { token: a1.token }), 'DUEL_NOT_OPEN', 'Үүсгэгч гарахгүй (цуцална)');

  await call('POST', '/duels/join', { token: b1.token, body: { code } });
  const full = await call<DuelResponse>('POST', '/duels/join', { token: b2.token, body: { code } });
  check(full.duel.status === 'accepted' && full.duel.members.length === 4, 'Хоёр баг дүүрмэгц тулаан эхэлнэ', full.duel.status);
  const pts = await Promise.all([a1, a2, b1, b2].map((u) => me(u.token).then((m) => m.points)));
  check(pts.every((p) => p === 45), 'Бүх гишүүний бооцоо түр хасагдлаа (50 → 45)', pts);
  const lobbyA2 = await call<LobbyResponse>('GET', '/duels', { token: a2.token });
  check(lobbyA2.mine?.id === duel.id && lobbyA2.mine.status === 'accepted', 'Гишүүд лобби poll-оор эхэлснийг мэдэнэ');

  const players = await Promise.all(
    [a1, a2, b1, b2].map((u, i) => WsPlayer.open(['A1', 'A2', 'B1', 'B2'][i], duel.id, u.token)),
  );
  const [pa1, pa2, pb1, pb2] = players;
  await Promise.all(players.map((p) => p.waitFor('countdown', 5_000)));
  check(true, 'Дөрвүүлээ холбогдож 3-2-1 эхэллээ');
  for (let i = 0; i < 5; i++) {
    const qs = await Promise.all(players.map((p) => p.waitFor('question', 6_000)));
    if (i === 0) check(new Set(qs.map((q) => q.questionId)).size === 4, 'Хүн бүрт өөр асуулт');
    const ci = await Promise.all(qs.map((q) => correctIndex(q.questionId)));
    // А1 үргэлж зөв, Б1 зөвхөн эхний асуултад зөв, бусад нь буруу
    const good = [true, false, i === 0, false];
    players.forEach((p, j) => p.answer(qs[j].q, good[j] ? ci[j] : (ci[j] + 1) % 4));
    const r = await pa1.waitFor('reveal', 3_000, (m) => m.q === qs[0].q);
    if (i === 0) check(r.correct.length === 2 && r.teamScores.a === 1 && r.teamScores.b === 1, 'Зөв хариулт бүр багтаа оноо (1:1)', r);
  }
  const f = await pb2.waitFor('finished', 6_000);
  check(f.outcome.winnerTeam === 'a' && f.outcome.teamScores.a === 5 && f.outcome.teamScores.b === 1, 'А баг 5:1-ээр яллаа', f.outcome);
  const after = [a1, a2, b1, b2].map((u) => f.outcome.points[u.me.id]);
  check(JSON.stringify(after) === JSON.stringify([55, 55, 45, 45]), 'Ялсан багийн гишүүн бүр +5 (55 / 55 / 45 / 45)', after);
  const won = (await call<DuelResponse>('GET', `/duels/${duel.id}`, { token: a2.token })).duel;
  check(won.status === 'finished' && won.creatorScore === 5 && won.opponentScore === 1, 'D1 дээр багийн оноо хадгалагдсан');
  for (const p of players) p.close();
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
