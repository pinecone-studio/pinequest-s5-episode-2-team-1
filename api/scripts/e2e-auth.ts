// Нэвтрэлтийн хязгаар ба session-ийг ажиллаж буй API (npm run dev) дээр шалгана:
//   npx tsx scripts/e2e-auth.ts
import type { AuthResponse, MeResponse } from '../../shared/types';
import { GAME } from '../src/config/game';
import { check, expectError, failureCount, register, testNet } from './e2e-lib';
import { call } from './lib';

const { USER_FAILS, NETWORK_SIGNUPS } = GAME.AUTH.LIMIT;
const login = (username: string, password: string, ip: string) =>
  call<AuthResponse>('POST', '/auth/login', { body: { username, password }, headers: { 'cf-connecting-ip': ip } });

async function main() {
  console.log('\n— Нэвтрэлтийн хязгаар, session');
  const kid = await register('limit', 7);
  const username = kid.me.username;

  // Зөв нууц үг тоологдохгүй: олон удаа нэвтэрсэн ч хязгаарт хүрэхгүй.
  for (let i = 0; i < USER_FAILS + 2; i++) await login(username, 'e2e-pass-123', testNet());
  check(true, `Зөв нууц үгээр ${USER_FAILS + 2} удаа нэвтэрнэ`);

  // Нэг нэр: өөр өөр сүлжээнээс ч USER_FAILS буруу оролдлогын дараа зөв нууц үгийг ч хүлээж авахгүй.
  for (let i = 0; i < USER_FAILS; i++) await expectError(login(username, 'wrong-pass', testNet()), 'INVALID_CREDENTIALS', `Буруу нууц үг ${i + 1}`);
  await expectError(login(username, 'e2e-pass-123', testNet()), 'FORBIDDEN', 'Хязгаарт хүрсэн нэр зөв нууц үгээр ч түр нэвтрэхгүй');

  // Хуучин token хүчинтэй хэвээр (хязгаар зөвхөн шинэ нэвтрэлтэд).
  const { me } = await call<MeResponse>('GET', '/me', { token: kid.token });
  check(me.username === username, 'Нэвтэрсэн session хязгаарт өртөхгүй');

  // Нэг сүлжээнээс NETWORK_SIGNUPS бүртгэлийн дараа татгалзана, өөр сүлжээнээс бүртгүүлнэ.
  const net = testNet();
  const signup = (i: number) =>
    call('POST', '/auth/register', {
      body: { username: `lim${Date.now().toString(36).slice(-6)}${i}`, password: 'e2e-pass-123', grade: 7 },
      headers: { 'cf-connecting-ip': net },
    });
  for (let i = 0; i < NETWORK_SIGNUPS; i++) await signup(i);
  await expectError(signup(NETWORK_SIGNUPS), 'FORBIDDEN', `Нэг сүлжээнээс ${NETWORK_SIGNUPS + 1} дэх бүртгэл үүсэхгүй`);
  check(!!(await register('limit_other', 7)).token, 'Өөр сүлжээнээс бүртгүүлсээр байна');

  const failures = failureCount();
  console.log(failures === 0 ? '\nБҮГД АМЖИЛТТАЙ ✅' : `\n${failures} шалгалт амжилтгүй ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
