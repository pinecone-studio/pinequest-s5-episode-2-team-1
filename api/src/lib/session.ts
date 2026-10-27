import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ubDay } from '../domain/time';
import type { AppEnv } from '../env';
import { newSessionToken, sha256Hex } from './auth';
import { ApiError } from './errors';

export async function userIdForToken(db: D1Database, token: string): Promise<number | null> {
  const row = await db
    .prepare('SELECT user_id FROM sessions WHERE token_hash = ?')
    .bind(await sha256Hex(token))
    .first<{ user_id: number }>();
  return row?.user_id ?? null;
}

export async function createSession(db: D1Database, userId: number, now = Date.now()): Promise<string> {
  const token = newSessionToken();
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, now)
    .run();
  return token;
}

export function bearerToken(c: Context): string | null {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * WebSocket upgrade-ийн хэрэглэгч. Браузер/RN-ийн WebSocket нь Authorization header илгээж чаддаггүй тул token-ийг
 * subprotocol-оор авна: `new WebSocket(url, ['bearer', token])`. URL-д (тэгэхээр log-д) token орохгүй.
 * Хариу 101-д `Sec-WebSocket-Protocol: bearer`-ийг буцаах ёстой.
 */
export async function socketUserId(c: Context<AppEnv>): Promise<number> {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') throw new ApiError(400, 'BAD_REQUEST', 'WebSocket хүлээж байна');
  const [scheme, token] = (c.req.header('sec-websocket-protocol') ?? '').split(',').map((s) => s.trim());
  const userId = scheme === 'bearer' && token ? await userIdForToken(c.env.DB, token) : null;
  if (!userId) throw new ApiError(401, 'UNAUTHORIZED', 'Нэвтрэх шаардлагатай');
  return userId;
}

/**
 * Хэрэглэгч өнөөдөр (UB) апп ашигласныг admin dashboard-д тэмдэглэнэ: өдөрт нэг мөр, дараагийн хүсэлтүүд юу ч
 * бичихгүй. Хариуг хүлээлгэхгүй, алдаа нь хүсэлтийг унагахгүй.
 */
export function trackActive(c: Context<AppEnv>, userId: number, now = Date.now()) {
  const insert = c.env.DB.prepare('INSERT OR IGNORE INTO user_activity (user_id, day, first_at) VALUES (?, ?, ?)')
    .bind(userId, ubDay(now), now)
    .run();
  c.executionCtx.waitUntil(insert.catch((e) => console.error('[activity]', e)));
}

/** `Authorization: Bearer <token>` шаардана, c.var.userId-г тохируулна. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearerToken(c);
  const userId = token ? await userIdForToken(c.env.DB, token) : null;
  if (!userId) throw new ApiError(401, 'UNAUTHORIZED', 'Нэвтрэх шаардлагатай');
  c.set('userId', userId);
  trackActive(c, userId);
  await next();
});
