import { GAME } from '../config/game';
import { sha256Hex } from '../lib/auth';
import { ApiError } from '../lib/errors';

/**
 * Нэвтрэх, бүртгүүлэх оролдлогын хязгаар (auth_attempts хүснэгт): нууц үг таах, PBKDF2-оор CPU дүүргэхээс.
 * Түлхүүр бүр WINDOW_MS-д `max`-аас олон оролдлоготой бол 429. IP-г өөрийг нь биш sha256-ийг нь хадгална.
 */
interface Limit {
  key: string;
  max: number;
}

const { WINDOW_MS, USER_FAILS, NETWORK_FAILS, NETWORK_SIGNUPS } = GAME.AUTH.LIMIT;

/** Хязгаарын түлхүүр: IPv4 бүтнээрээ, IPv6 /64 (нэг гэрийн сүлжээ олон хаягтай). Header байхгүй бол (local) нэг түлхүүр. */
export function networkOf(ip: string | undefined): string {
  if (!ip) return 'local';
  return ip.includes(':') ? ip.toLowerCase().split(':').slice(0, 4).join(':') : ip;
}

/** Нэвтрэх: нэг нэрийн нууц үгийг таах, нэг сүлжээнээс олон нэрийг оролдох. */
export async function loginLimits(username: string, ip: string | undefined): Promise<Limit[]> {
  const net = await sha256Hex(networkOf(ip));
  return [
    { key: `user:${username}`, max: USER_FAILS },
    { key: `net:${net}`, max: NETWORK_FAILS },
  ];
}

/** Бүртгүүлэх: нэг сүлжээнээс олон бүртгэл. */
export async function registerLimits(ip: string | undefined): Promise<Limit[]> {
  return [{ key: `reg:${await sha256Hex(networkOf(ip))}`, max: NETWORK_SIGNUPS }];
}

export async function assertUnderLimits(db: D1Database, limits: Limit[], now = Date.now()): Promise<void> {
  const counts = await Promise.all(
    limits.map((l) =>
      db
        .prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND created_at > ?')
        .bind(l.key, now - WINDOW_MS)
        .first<{ n: number }>(),
    ),
  );
  if (limits.some((l, i) => (counts[i]?.n ?? 0) >= l.max)) {
    throw new ApiError(429, 'FORBIDDEN', 'Хэт олон оролдлого хийлээ. 15 минутын дараа дахин оролдоно уу');
  }
}

/** Оролдлогыг тэмдэглэнэ; хугацаа нь өнгөрсөн мөрүүдийг хамт устгаж хүснэгтийг жижиг байлгана. */
export async function recordAttempts(db: D1Database, limits: Limit[], now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM auth_attempts WHERE created_at <= ?').bind(now - WINDOW_MS),
    ...limits.map((l) => db.prepare('INSERT INTO auth_attempts (key, created_at) VALUES (?, ?)').bind(l.key, now)),
  ]);
}
