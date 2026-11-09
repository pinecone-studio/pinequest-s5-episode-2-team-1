import { GAME } from '../config/game';
import { sha256Hex } from '../lib/auth';
import { ApiError } from '../lib/errors';

/**
 * Нэвтрэх, бүртгүүлэх оролдлогын хязгаар (auth_attempts хүснэгт): нууц үг таах, PBKDF2-оор CPU дүүргэхээс.
 * Түлхүүр бүр windowMs (default WINDOW_MS)-д `max`-аас олон оролдлоготой бол 429. IP-г өөрийг нь биш sha256-ийг нь хадгална.
 */
interface Limit {
  key: string;
  max: number;
  windowMs?: number;
}

const { WINDOW_MS, USER_FAILS, NETWORK_FAILS, NETWORK_SIGNUPS } = GAME.AUTH.LIMIT;
/** Хамгийн урт цонх: үүнээс хуучин мөрийг устгана. */
const KEEP_MS = WINDOW_MS;

/** Хязгаарын түлхүүр: IPv4 бүтнээрээ, IPv6 /64 (нэг гэрийн сүлжээ олон хаягтай). Header байхгүй бол (local) нэг түлхүүр. */
export function networkOf(ip: string | undefined): string {
  if (!ip) return 'local';
  if (!ip.includes(':') || ip.includes('.')) return ip;
  // '::'-г задалж 8 бүлэг болгоно: үгүй бол 2001:db8::1:2:3:4 шиг хаягийн /64 нь interface id-г агуулна.
  const [head, tail] = ip.toLowerCase().split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = tail === undefined ? h : [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':');
}

/** Нэвтрэх: нэг сүлжээнээс нэг нэрийн нууц үгийг таах (өөр сүлжээнээс эзнийг нь түгжихгүй), нэг сүлжээнээс олон нэр. */
export async function loginLimits(username: string, ip: string | undefined): Promise<Limit[]> {
  const net = await sha256Hex(networkOf(ip));
  return [
    { key: `user:${username}:${net}`, max: USER_FAILS },
    { key: `net:${net}`, max: NETWORK_FAILS },
  ];
}

/** Бүртгүүлэх: нэг сүлжээнээс олон бүртгэл. */
export async function registerLimits(ip: string | undefined): Promise<Limit[]> {
  return [{ key: `reg:${await sha256Hex(networkOf(ip))}`, max: NETWORK_SIGNUPS }];
}

const tooMany = () => new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Хэт олон оролдлого хийлээ. 15 минутын дараа дахин оролдоно уу');

/**
 * Оролдлогыг эхлээд бичээд дараа нь тоолно (нэг batch = нэг transaction): зэрэг ирсэн хүсэлтүүд бие биенээ тоолох
 * тул хязгаарыг давж чадахгүй. Хязгаарт хүрсэн бол өөрийн мөрийг устгаад `error` шиднэ (татгалзсан нь тоологдохгүй).
 * Хуучин мөрүүдийг хамт устгаж хүснэгтийг жижиг байлгана.
 */
export async function takeAttempts(db: D1Database, limits: Limit[], now = Date.now(), error = tooMany()): Promise<void> {
  const results = await db.batch<{ n: number }>([
    db.prepare('DELETE FROM auth_attempts WHERE created_at <= ?').bind(now - KEEP_MS),
    ...limits.map((l) => db.prepare('INSERT INTO auth_attempts (key, created_at) VALUES (?, ?)').bind(l.key, now)),
    ...limits.map((l) =>
      db.prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND created_at > ?').bind(l.key, now - (l.windowMs ?? WINDOW_MS)),
    ),
  ]);
  const counts = results.slice(1 + limits.length);
  if (limits.some((l, i) => (counts[i]?.results[0]?.n ?? 0) > l.max)) {
    await forgetAttempts(db, limits, now);
    throw error;
  }
}

/** takeAttempts-ийн бичсэн мөрийг (түлхүүр бүрээс яг нэгийг) буцааж устгана: зөв нууц үг тоологдохгүй. */
export async function forgetAttempts(db: D1Database, limits: Limit[], now: number): Promise<void> {
  await db.batch(
    limits.map((l) =>
      db
        .prepare('DELETE FROM auth_attempts WHERE rowid IN (SELECT rowid FROM auth_attempts WHERE key = ? AND created_at = ? LIMIT 1)')
        .bind(l.key, now),
    ),
  );
}
