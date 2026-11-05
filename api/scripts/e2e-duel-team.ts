import type { DuelResponse, LobbyResponse } from '../../shared/types';
import { call } from './lib';
import { check, correctIndex, expectError, me, register, WsPlayer } from './e2e-lib';

/** 2 vs 2: кодоор баг бүрдүүлж, баг солиод, дүүрмэгц эхэлнэ; зөв хариулт бүр багтаа оноо. */
export async function teamDuel() {
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
