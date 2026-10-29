// Уул (ангийн баг): байгуулах, кодоор нэгдэх, 40 хүний хязгаар, өндөр, эзэн, гарах. `npm run e2e -- --only clans`
import type { ClanPreviewResponse, MeResponse, MyClanResponse, MyProfileResponse, ProfileResponse } from '../../shared/types';
import { check, doTask, expectError, register } from './e2e-lib';
import { call } from './lib';

const mine = async (token: string) => (await call<MyClanResponse>('GET', '/clans/mine', { token })).clan;
const join = (token: string, code: string) => call<MyClanResponse>('POST', `/clans/${code}/join`, { token });
const profileCode = async (token: string) => (await call<MyProfileResponse>('GET', '/me/profile', { token })).code;

export async function runClansScenario() {
  console.log('\n— Уул байгуулах');
  const a = await register('cl_a', 7);
  await call<MeResponse>('PUT', '/me/avatar', { token: a.token, body: { name: 'Төгсбилэг', fur: 'brown', face: 'calm', chest: true } });
  check((await mine(a.token)) === null, 'Эхэндээ Уулгүй');
  const created = (await call<MyClanResponse>('POST', '/clans', { token: a.token, body: {} })).clan!;
  check(created.name === 'Төгсбилэгийн', 'Нэр өгөөгүй бол "Төгсбилэгийн" (Төгсбилэгийн Уул)', created.name);
  check(/^\d{6}$/.test(created.code) && created.isOwner && created.members.length === 1 && created.maxMembers === 40, 'Үүсгэгч эзэн, анхны гишүүн, 6 оронтой код', created);
  await expectError(call('POST', '/clans', { token: a.token, body: {} }), 'CLAN_MEMBER', 'Ууланд байхдаа дахин байгуулахгүй');

  console.log('\n— Кодоор нэгдэх');
  const b = await register('cl_b', 7);
  const preview = await call<ClanPreviewResponse>('GET', `/clans/${created.code}`, { token: b.token });
  check(preview.status === 'none' && preview.clan.members === 1 && preview.clan.owner === 'Төгсбилэг', 'Нэгдэхээс өмнө Уулыг харна', preview);
  check(!JSON.stringify(preview).includes('"id"'), 'Урьдчилан харахад id орохгүй');
  const joined = (await join(b.token, created.code.replace(/(\d{3})/, '$1 '))).clan!;
  check(joined.members.length === 2 && !joined.isOwner, 'Б зайтай кодоор нэгдэнэ (эзэн биш)');
  check((await join(b.token, created.code)).clan?.members.length === 2, 'Дахин нэгдэхэд давхардахгүй');
  check((await call<ClanPreviewResponse>('GET', `/clans/${created.code}`, { token: b.token })).status === 'member', 'Б-д "энэ Ууланд байна"');
  await expectError(join(b.token, '000000'), 'CLAN_NOT_FOUND', 'Байхгүй код');
  await expectError(join(b.token, '12345'), 'BAD_REQUEST', 'Буруу урттай код');

  const c = await register('cl_c', 8);
  const other = (await call<MyClanResponse>('POST', '/clans', { token: c.token, body: { name: '8Б ангийн Уул' } })).clan!;
  check(other.name === '8Б ангийн', 'Өгсөн нэрнээс давхар "Уул"-ыг хасна', other.name);
  await expectError(join(b.token, other.code), 'CLAN_MEMBER', 'Өөр Ууланд байхдаа нэгдэхгүй');
  check((await call<ClanPreviewResponse>('GET', `/clans/${other.code}`, { token: b.token })).status === 'elsewhere', 'Б-д "өөр Ууланд байна"');

  console.log('\n— Уулын өндөр');
  await doTask(b.token, 'math', true);
  const grown = (await mine(a.token))!;
  const bRow = grown.members.find((m) => m.username === b.me.username);
  check((bRow?.meters ?? 0) > 0 && bRow?.weekMeters === bRow?.meters, 'Б-гийн зөв хариулт Уулыг өндөрсгөнө (энэ 7 хоногт)', bRow);
  check(grown.members[0].username === b.me.username, 'Энэ 7 хоногт их өндөрсгөсөн нь эхэндээ');
  check(grown.height === grown.members.reduce((s, m) => s + m.meters, 0), 'Өндөр = гишүүдийн метрийн нийлбэр', grown.height);

  console.log('\n— Профайл дээр');
  const aProfile = await call<ProfileResponse>('GET', `/profiles/${await profileCode(a.token)}`, { token: c.token });
  check(aProfile.profile.clan === 'Төгсбилэгийн', 'Профайл дээр Уулын нэр (кодгүй)', aProfile.profile.clan);
  check(!JSON.stringify(aProfile).includes(created.code), 'Профайлаар Уулын урилгын код задрахгүй');

  console.log('\n— Эзэн: нэр, код, гишүүн хасах');
  await expectError(call('PATCH', '/clans/mine', { token: b.token, body: { name: 'Б' } }), 'FORBIDDEN', 'Гишүүн нэр солихгүй');
  await expectError(call('POST', '/clans/mine/code', { token: b.token }), 'FORBIDDEN', 'Гишүүн код солихгүй');
  check((await call<MyClanResponse>('PATCH', '/clans/mine', { token: a.token, body: { name: '7А ангийн' } })).clan?.name === '7А ангийн', 'Эзэн нэр солино');
  await expectError(call('PATCH', '/clans/mine', { token: a.token, body: { name: ' Уул ' } }), 'BAD_REQUEST', 'Хоосон нэр болохгүй');
  const rotated = (await call<MyClanResponse>('POST', '/clans/mine/code', { token: a.token })).clan!;
  check(rotated.code !== created.code && rotated.members.length === 2, 'Код солиход гишүүд хэвээр');
  await expectError(call('GET', `/clans/${created.code}`, { token: c.token }), 'CLAN_NOT_FOUND', 'Хуучин код ажиллахаа болино');
  const bCode = grown.members.find((m) => m.username === b.me.username)!.code;
  await expectError(call('DELETE', `/clans/mine/members/${(await mine(a.token))!.members.find((m) => m.isMe)!.code}`, { token: b.token }), 'FORBIDDEN', 'Гишүүн хасахгүй');
  check((await call<MyClanResponse>('DELETE', `/clans/mine/members/${bCode}`, { token: a.token })).clan?.members.length === 1, 'Эзэн Б-г хасна');
  check((await mine(b.token)) === null, 'Хасагдсан Б Уулгүй');

  console.log('\n— 40 хүний хязгаар');
  const code = rotated.code;
  await join(b.token, code);
  const extra = await Promise.all(Array.from({ length: 39 }, (_, i) => register(`cl_m${i}`, 7)));
  // 39 болсны дараа сүүлчийн нэг орон руу хоёр хүүхэд зэрэг нэгдэхэд 40-өөс хэтрэхгүй
  await Promise.all(extra.slice(0, 37).map((u) => join(u.token, code)));
  const lastTwo = await Promise.allSettled([join(extra[37].token, code), join(extra[38].token, code)]);
  const full = (await mine(a.token))!;
  check(full.members.length === 40, 'Яг 40 гишүүн', full.members.length);
  check(lastTwo.filter((r) => r.status === 'rejected').length === 1, 'Зэрэг нэгдсэн хоёроос нэг нь л орно', lastTwo.map((r) => r.status));
  const late = await register('cl_late', 7);
  await expectError(join(late.token, code), 'CLAN_FULL', '41 дэх нь нэгдэж чадахгүй');

  console.log('\n— Гарах, эзэн шилжих');
  check((await call<MyClanResponse>('POST', '/clans/mine/leave', { token: a.token })).clan === null, 'Эзэн гарна');
  const afterOwner = (await mine(b.token))!;
  check(afterOwner.isOwner && afterOwner.members.length === 39, 'Хамгийн эрт нэгдсэн Б эзэн болно', afterOwner.members.length);
  check((await join(late.token, code)).clan?.members.length === 40, 'Сул орон гарахад нэгдэж болно');

  await call('POST', '/clans/mine/leave', { token: c.token });
  await expectError(call('GET', `/clans/${other.code}`, { token: a.token }), 'CLAN_NOT_FOUND', 'Сүүлчийн гишүүн гарвал Уул устна');
  check((await call<MyClanResponse>('POST', '/clans/mine/leave', { token: c.token })).clan === null, 'Уулгүй үед гарах нь алдаагүй');
  await expectError(call('GET', '/clans/mine'), 'UNAUTHORIZED', 'Нэвтрээгүй бол Уул харагдахгүй');
}
