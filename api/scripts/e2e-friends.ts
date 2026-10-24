// Найзууд: кодоор (QR) хүсэлт, зөвшөөрөх, харилцан хүсэлт, хасах. `npm run e2e -- --only friends`
import type { FriendActionResponse, FriendsResponse, MeResponse, MyProfileResponse, ProfileResponse } from '../../shared/types';
import { check, expectError, register } from './e2e-lib';
import { call } from './lib';

const code = async (token: string) => (await call<MyProfileResponse>('GET', '/me/profile', { token })).code;
const friends = (token: string) => call<FriendsResponse>('GET', '/friends', { token });
const add = (token: string, c: string) => call<FriendActionResponse>('POST', '/friends', { token, body: { code: c } });

export async function runFriendsScenario() {
  console.log('\n— Найзын хүсэлт (QR уншуулах)');
  const a = await register('fr_a', 7);
  const b = await register('fr_b', 8);
  const c = await register('fr_c', 6);
  const aCode = await code(a.token);

  check((await add(b.token, aCode)).friend === 'outgoing', 'Б А-гийн QR-ийг уншуулаад хүсэлт илгээнэ');
  check((await add(b.token, aCode)).friend === 'outgoing', 'Дахин илгээхэд давхардахгүй');
  check((await call<ProfileResponse>('GET', `/profiles/${aCode}`, { token: b.token })).friend === 'outgoing', 'Б-д А-гийн профайл дээр "хүсэлт илгээсэн"');
  const aMe = (await call<MeResponse>('GET', '/me', { token: a.token })).me;
  check(aMe.friendRequests === 1, 'А-д 1 шинэ хүсэлт (аватар дээр цэг)', aMe.friendRequests);
  const aList = await friends(a.token);
  const bCode = aList.incoming[0]?.code;
  check(aList.incoming.length === 1 && aList.incoming[0].username === b.me.username && /^\d{8}$/.test(bCode ?? ''), 'А-гийн жагсаалтад Б-гийн хүсэлт, Б-гийн профайлын кодтой', aList);
  check(!JSON.stringify(aList).includes('"id"'), 'Найзын жагсаалтад id орохгүй');
  check((await call<ProfileResponse>('GET', `/profiles/${bCode}`, { token: a.token })).friend === 'incoming', 'А-д Б-гийн профайл дээр "хүсэлт ирсэн"');

  check((await add(a.token, bCode!)).friend === 'friends', 'А зөвшөөрнө (хүсэлтийг кодоор)');
  const aAfter = await friends(a.token);
  const bAfter = await friends(b.token);
  check(aAfter.friends.length === 1 && aAfter.incoming.length === 0, 'А-гийн найз 1, хүсэлт 0');
  check(bAfter.friends[0]?.username === a.me.username && bAfter.outgoing.length === 0, 'Б-гийн найзуудад А');
  check((await call<MeResponse>('GET', '/me', { token: a.token })).me.friendRequests === 0, 'Зөвшөөрсний дараа цэг алга');

  console.log('\n— Харилцан уншуулах, татгалзах, хасах');
  const cCode = await code(c.token);
  await add(c.token, aCode);
  check((await add(a.token, cCode)).friend === 'friends', 'Хоёулаа бие биеийнхээ QR-ийг уншуулбал шууд найз');
  await expectError(add(a.token, aCode), 'BAD_REQUEST', 'Өөрийгөө найзаар нэмэхгүй');
  await expectError(add(a.token, '00000000'), 'PROFILE_NOT_FOUND', 'Байхгүй код');

  const d = await register('fr_d', 9);
  await add(d.token, aCode);
  check((await call<FriendActionResponse>('DELETE', `/friends/${(await friends(a.token)).incoming[0].code}`, { token: a.token })).friend === 'none', 'А хүсэлтийг татгалзана');
  check((await friends(d.token)).outgoing.length === 0, 'Татгалзсан хүсэлт Д-гийн жагсаалтаас алга');
  check((await add(d.token, aCode)).friend === 'outgoing', 'Татгалзсаны дараа дахин хүсэлт илгээж болно');
  await call('DELETE', `/friends/${aCode}`, { token: d.token });
  check((await friends(a.token)).incoming.length === 0, 'Илгээгч хүсэлтээ цуцална');

  await call('DELETE', `/friends/${aCode}`, { token: b.token });
  check((await friends(a.token)).friends.length === 1 && (await friends(b.token)).friends.length === 0, 'Б А-г найзаас хасахад хоёуланд нь алга (А-д зөвхөн В)');

  console.log('\n— Код солих');
  const rotated = (await call<MyProfileResponse>('POST', '/me/profile/code', { token: c.token })).code;
  const cInList = (await friends(a.token)).friends.find((f) => f.username === c.me.username);
  check(cInList?.code === rotated, 'Найзын жагсаалтад шинэ код харагдана');
  await expectError(call('GET', '/friends'), 'UNAUTHORIZED', 'Нэвтрээгүй бол найзууд харагдахгүй');
}
