import type { DuelResponse, LobbyResponse } from '../../shared/types';
import { call, sleep } from './lib';
import { check, connectBoth, doTask, expectError, me, register } from './e2e-lib';

export async function limitsAndEscrow() {
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

export async function inviteCode() {
  console.log('\n— Тулаан: урилгын код, найзын (private) сорилт');
  const a = await register('code_a', 7);
  const b = await register('code_b', 7);
  const x = await register('code_x', 6);

  const { duel } = await call<DuelResponse>('POST', '/duels', { token: a.token, body: { subject: 'math', stake: 3, visibility: 'private' } });
  check(duel.visibility === 'private' && /^\d{6}$/.test(duel.code ?? ''), 'Найзын сорилт 6 оронтой кодтой үүслээ', duel.code);
  const code = duel.code!;
  const lobbyB = await call<LobbyResponse>('GET', '/duels', { token: b.token });
  check(!lobbyB.open.some((d) => d.id === duel.id), 'Найзын сорилт лобби дээр гарахгүй');
  await expectError(call('GET', `/duels/${duel.id}`, { token: b.token }), 'NOT_FOUND', 'Оролцоогүй хүн тулааныг id-аар харахгүй (нэвтрэх нэр задрахгүй)');
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
export async function lobbyPresence() {
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
