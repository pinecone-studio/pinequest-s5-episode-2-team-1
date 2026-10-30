import type { AuthResponse, DuelResponse, LobbyResponse, MeResponse } from '../../shared/types';
import { call } from './lib';
import { check, expectError, register } from './e2e-lib';

const judge = (ip?: string) =>
  call<AuthResponse>('POST', '/auth/judge', ip ? { headers: { 'cf-connecting-ip': ip } } : {});

/** Шүүгч: хүүхэдтэй тулалдахгүй (боргоцой шилжүүлэхээс), дурын хувцсаа профайлд хадгална, сүлжээ тус бүрийн хязгаар. */
export async function runJudgeScenario(): Promise<void> {
  console.log('\n— Шүүгч: тулаан, хувцас, бүртгэлийн хязгаар');
  // Санамсаргүй IP: e2e-г дахин ажиллуулахад өмнөх бүртгэлүүд хязгаарт тоологдохгүй.
  const net = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  const j1 = await judge(net);
  const j2 = await judge(net);
  const kid = await register('judge_kid', j1.me.grade);
  check(j1.me.judge && j2.me.judge && !kid.me.judge, 'Хоёр шүүгч, нэг хүүхэд ижил ангид');

  const { duel: kidDuel } = await call<DuelResponse>('POST', '/duels', { token: kid.token, body: { subject: 'math', stake: 5 } });
  const judgeLobby = await call<LobbyResponse>('GET', '/duels', { token: j1.token });
  check(!judgeLobby.open.some((d) => d.id === kidDuel.id), 'Шүүгчийн лобби дээр хүүхдийн сорилт харагдахгүй');
  await expectError(call('POST', `/duels/${kidDuel.id}/accept`, { token: j1.token }), 'JUDGE_DUEL', 'Шүүгч хүүхдийн сорилтыг авахгүй');
  await expectError(call('POST', '/duels/join', { token: j1.token, body: { code: kidDuel.code } }), 'JUDGE_DUEL', 'Шүүгч кодоор ч хүүхэдтэй тулалдахгүй');
  await call('POST', `/duels/${kidDuel.id}/cancel`, { token: kid.token });

  const { duel: judgeDuel } = await call<DuelResponse>('POST', '/duels', { token: j1.token, body: { subject: 'math', stake: 1000 } });
  const kidLobby = await call<LobbyResponse>('GET', '/duels', { token: kid.token });
  check(!kidLobby.open.some((d) => d.id === judgeDuel.id), 'Хүүхдийн лобби дээр шүүгчийн сорилт харагдахгүй');
  await expectError(call('POST', `/duels/${judgeDuel.id}/accept`, { token: kid.token }), 'JUDGE_DUEL', 'Хүүхэд шүүгчийн сорилтыг авахгүй');
  const otherJudge = await call<LobbyResponse>('GET', '/duels', { token: j2.token });
  check(otherJudge.open.some((d) => d.id === judgeDuel.id), 'Өөр шүүгч шүүгчийн сорилтыг лобби дээр харна');
  await call('POST', `/duels/${judgeDuel.id}/cancel`, { token: j1.token });

  // Дэлгүүр шүүгчид бүгдийг эзэмшсэн гэж харуулдаг тул аваагүй дэвсгэр, хувцсаа ч профайлд хадгална.
  const look = await call<MeResponse>('PUT', '/me/look', { token: j1.token, body: { bg: 'yagaan', outfit: 'pirate_hat+glasses' } });
  check(look.me.look.bg === 'yagaan' && look.me.look.outfit === 'pirate_hat+glasses', 'Шүүгч аваагүй дэвсгэр, хувцсаа хадгална', look.me.look);
  await expectError(call('PUT', '/me/look', { token: kid.token, body: { bg: 'yagaan', outfit: 'scarf' } }), 'NOT_OWNED', 'Хүүхэд аваагүй дэвсгэрээ хадгалахгүй');

  // Нэг сүлжээнээс өдөрт 20 (дээр 2-ыг үүсгэсэн): 21 дэх нь татгалзана, өөр сүлжээнээс орно.
  for (let i = 2; i < 20; i++) await judge(net);
  await expectError(judge(net), 'JUDGE_LIMIT', 'Нэг сүлжээнээс 21 дэх шүүгчийн бүртгэл үүсэхгүй');
  const other = await judge(`203.0.113.${Math.floor(Math.random() * 250) + 1}`);
  check(other.me.judge, 'Өөр сүлжээнээс шүүгч орсоор байна');
}
