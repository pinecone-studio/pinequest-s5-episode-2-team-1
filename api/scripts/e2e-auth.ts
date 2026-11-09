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

  // Нэг сүлжээнээс нэг нэрт USER_FAILS буруу оролдлогын дараа тэр сүлжээнээс зөв нууц үгийг ч хүлээж авахгүй.
  const attacker = testNet();
  for (let i = 0; i < USER_FAILS; i++) await expectError(login(username, 'wrong-pass', attacker), 'INVALID_CREDENTIALS', `Буруу нууц үг ${i + 1}`);
  await expectError(login(username, 'e2e-pass-123', attacker), 'TOO_MANY_ATTEMPTS', 'Хязгаарт хүрсэн сүлжээ зөв нууц үгээр ч түр нэвтрэхгүй');
  // Өөр сүлжээнээс эзэн нь нэвтэрсээр: нэрийг мэддэг хүн бүртгэлийг түгжиж чадахгүй.
  let owner = attacker;
  while (owner === attacker) owner = testNet();
  check(!!(await login(username, 'e2e-pass-123', owner)).token, 'Өөр сүлжээнээс эзэн нь нэвтэрнэ');
  // Бүртгэлтэй нэрийг оролдох нь бүртгэлийн хязгаарыг идэхгүй (доорх хязгаарын шалгалт үүнийг баталгаажуулна).
  await expectError(
    call('POST', '/auth/register', { body: { username, password: 'e2e-pass-123', grade: 7 } }),
    'USERNAME_TAKEN',
    'Бүртгэлтэй нэр 409',
  );

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
  await expectError(signup(NETWORK_SIGNUPS), 'TOO_MANY_ATTEMPTS', `Нэг сүлжээнээс ${NETWORK_SIGNUPS + 1} дэх бүртгэл үүсэхгүй`);
  check(!!(await register('limit_other', 7)).token, 'Өөр сүлжээнээс бүртгүүлсээр байна');

  const failures = failureCount();
  console.log(failures === 0 ? '\nБҮГД АМЖИЛТТАЙ ✅' : `\n${failures} шалгалт амжилтгүй ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
