// Профайл хуваалцах: код, бусдын профайл, баавгайн харагдац. `npm run e2e -- --only profiles`
import type { CosmeticsResponse, MeResponse, MyProfileResponse, ProfileResponse } from '../../shared/types';
import { check, doTask, expectError, register } from './e2e-lib';
import { call } from './lib';

export async function runProfilesScenario() {
  console.log('\n— Профайл хуваалцах');
  const a = await register('prof_a', 7);
  const b = await register('prof_b', 9);

  const mine = await call<MyProfileResponse>('GET', '/me/profile', { token: a.token });
  check(/^\d{8}$/.test(mine.code), '8 оронтой профайлын код анх нээхэд үүснэ', mine.code);
  const again = await call<MyProfileResponse>('GET', '/me/profile', { token: a.token });
  check(again.code === mine.code, 'Дахин нээхэд код хэвээр');
  check(mine.profile.username === a.me.username && mine.profile.grade === 7 && mine.profile.level === 1, 'Нэр, анги, шат');
  check(mine.profile.look.bg === 'nimbeg' && mine.profile.look.outfit === 'scarf', 'Анхдагч баавгай: Нимбэг дэвсгэр, ороолт');
  const raw = JSON.stringify(mine.profile);
  check(!/points|password|shield|"id"/.test(raw), 'Профайлд оноо, нууц үг, хамгаалалт, id орохгүй', raw);

  const seen = await call<ProfileResponse>('GET', `/profiles/${mine.code}`, { token: b.token });
  check(seen.profile.username === a.me.username && !seen.isMe, 'Өөр хүүхэд кодоор нь профайлыг харна');
  check((await call<ProfileResponse>('GET', `/profiles/${mine.code}`, { token: a.token })).isMe, 'Өөрийн кодоо оруулбал isMe');
  const spaced = `${mine.code.slice(0, 4)}%20${mine.code.slice(4)}`;
  check((await call<ProfileResponse>('GET', `/profiles/${spaced}`, { token: b.token })).profile.username === a.me.username, 'Зайтай бичсэн кодыг ч уншина');
  await expectError(call('GET', '/profiles/123456', { token: b.token }), 'BAD_REQUEST', 'Тулааны 6 оронтой код профайлын код биш');
  await expectError(call('GET', `/profiles/${mine.code}`), 'UNAUTHORIZED', 'Нэвтрээгүй бол профайл харахгүй');

  console.log('\n— Профайл дээрх ахиц');
  await doTask(a.token, 'math', true); // 50 → 100 оноо
  await doTask(a.token, 'physics', false);
  const grown = (await call<ProfileResponse>('GET', `/profiles/${mine.code}`, { token: b.token })).profile;
  const math = grown.skills.find((s) => s.subject === 'math');
  const physics = grown.skills.find((s) => s.subject === 'physics');
  check(grown.studyDays === 1 && grown.streak === 1, 'Нэг өдөр сурсан, дараалал 1', grown);
  check(math?.correct === 5 && math.answered === 5 && math.level === 2, 'Математик: 5/5 зөв, сурах замын 2-р шат', math);
  check(physics?.correct === 0 && physics.answered === 5, 'Физик: 0/5', physics);
  check(grown.duels.played === 0 && grown.duels.won === 0, 'Тулаан хийгээгүй');

  console.log('\n— Баавгайн харагдац (/me/look)');
  await expectError(call('PUT', '/me/look', { token: a.token, body: { bg: 'yagaan', outfit: 'scarf' } }), 'NOT_OWNED', 'Аваагүй дэвсгэрийг профайлд тавихгүй');
  await expectError(call('PUT', '/me/look', { token: a.token, body: { bg: 'nimbeg', outfit: 'glasses' } }), 'NOT_OWNED', 'Аваагүй нүдний шилийг тавихгүй');
  await expectError(call('PUT', '/me/look', { token: a.token, body: { bg: 'солонго', outfit: 'scarf' } }), 'BAD_REQUEST', 'Байхгүй дэвсгэр');
  const tal = await call<MeResponse>('PUT', '/me/look', { token: a.token, body: { bg: 'tal', outfit: 'scarf' } });
  check(tal.me.look.bg === 'tal', 'Үнэгүй дэвсгэрээ сонгоно (Me.look)');
  const bought = await call<CosmeticsResponse>('POST', '/cosmetics/bg_yagaan/buy', { token: a.token });
  check(bought.me.look.bg === 'tal', 'Худалдаж авах нь профайлын харагдацыг өөрөө солихгүй');
  await call<MeResponse>('PUT', '/me/look', { token: a.token, body: { bg: 'yagaan', outfit: 'scarf' } });
  const dressed = (await call<ProfileResponse>('GET', `/profiles/${mine.code}`, { token: b.token })).profile;
  check(dressed.look.bg === 'yagaan', 'Бусдад шинэ дэвсгэр харагдана', dressed.look);
  check(dressed.collection.bgs.includes('yagaan') && dressed.collection.bgs.includes('nimbeg') && !dressed.collection.bgs.includes('shunu'), 'Цуглуулгад авсан болон үнэгүй дэвсгэр', dressed.collection);

  console.log('\n— Код солих');
  const rotated = await call<MyProfileResponse>('POST', '/me/profile/code', { token: a.token });
  check(rotated.code !== mine.code && /^\d{8}$/.test(rotated.code), 'Шинэ код', rotated.code);
  await expectError(call('GET', `/profiles/${mine.code}`, { token: b.token }), 'PROFILE_NOT_FOUND', 'Хуучин код ажиллахаа болино');
  check((await call<ProfileResponse>('GET', `/profiles/${rotated.code}`, { token: b.token })).profile.username === a.me.username, 'Шинэ кодоор олдоно');
}
