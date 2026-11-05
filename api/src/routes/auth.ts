import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResponse } from '../../../shared/types';
import { DEFAULT_EQUIPPED, GAME } from '../config/game';
import { tierForGrade } from '../domain/level';
import { ubDay } from '../domain/time';
import type { AppEnv } from '../env';
import { hashPassword, newSessionToken, normalizeUsername, sha256Hex, usernameError, verifyPassword } from '../lib/auth';
import { ApiError, readBody } from '../lib/errors';
import { bearerToken, createSession, requireAuth, trackActive } from '../lib/session';
import { assertUnderLimits, loginLimits, recordAttempts, registerLimits } from '../services/authLimits';
import { loadMe } from '../services/users';

const registerSchema = z.object({
  username: z.string(),
  password: z.string().min(GAME.AUTH.PASSWORD_MIN).max(GAME.AUTH.PASSWORD_MAX),
  // шинэ апп ангийг onboarding-д асуудаг (тэр хүртэл GRADE_MIN); хуучин апп бүртгэлдээ илгээнэ
  grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX).default(GAME.GRADE_MIN),
  onboarded: z.boolean().default(true),
  // багш: асуулга, баавгайн профайлгүй, шууд багшийн хэсэгт орно
  teacher: z.boolean().default(false),
});

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const authRoutes = new Hono<AppEnv>();

// Зөвхөн нэр, нууц үг, анги авна (имэйл, утас, жинхэнэ нэр авахгүй).
authRoutes.post('/register', async (c) => {
  const body = await readBody(c, registerSchema);
  const username = normalizeUsername(body.username);
  const invalid = usernameError(username);
  if (invalid) throw new ApiError(400, 'BAD_REQUEST', invalid);
  const tier = tierForGrade(body.grade);
  if (!tier) throw new ApiError(400, 'BAD_REQUEST', 'Анги буруу');

  const db = c.env.DB;
  const now = Date.now();
  // Бүртгэл бүр PBKDF2 боддог тул нэг сүлжээнээс олон удаа үүсгэж CPU дүүргэхээс сэргийлнэ.
  const limits = await registerLimits(c.req.header('cf-connecting-ip'));
  await assertUnderLimits(db, limits, now);
  await recordAttempts(db, limits, now);
  const passwordHash = await hashPassword(body.password);
  const token = newSessionToken();
  const tokenHash = await sha256Hex(token);

  // Хэрэглэгч, эхлэх онооны ledger, session, өнөөдрийн идэвх (dashboard)-ийг нэг batch-аар (атомик) үүсгэнэ.
  try {
    await db.batch([
      db
        .prepare('INSERT INTO users (username, password_hash, grade, tier, points, equipped, created_at, onboarding, is_teacher) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(username, passwordHash, body.grade, tier, GAME.START_POINTS, JSON.stringify(DEFAULT_EQUIPPED), now, body.onboarded || body.teacher ? '{}' : null, body.teacher ? 1 : 0),
      db
        .prepare(
          `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
           SELECT id, ?, 'signup_bonus', 'user', id, ? FROM users WHERE username = ?`,
        )
        .bind(GAME.START_POINTS, now, username),
      db
        .prepare('INSERT INTO sessions (token_hash, user_id, created_at) SELECT ?, id, ? FROM users WHERE username = ?')
        .bind(tokenHash, now, username),
      db
        .prepare('INSERT INTO user_activity (user_id, day, first_at) SELECT id, ?, ? FROM users WHERE username = ?')
        .bind(ubDay(now), now, username),
    ]);
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new ApiError(409, 'USERNAME_TAKEN', 'Энэ нэр бүртгэлтэй байна');
    throw e;
  }

  const row = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first<{ id: number }>();
  if (!row) throw new ApiError(500, 'INTERNAL');
  return c.json<AuthResponse>({ token, me: await loadMe(db, row.id, now) }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await readBody(c, loginSchema);
  const db = c.env.DB;
  const username = normalizeUsername(body.username);
  // Зөвхөн буруу оролдлого тоологдоно: зөв нууц үгтэй анги бүхэлдээ нэг Wi-Fi-аас саадгүй нэвтэрнэ.
  const limits = await loginLimits(username, c.req.header('cf-connecting-ip'));
  await assertUnderLimits(db, limits);
  const user = await db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; password_hash: string }>();
  // Нэр олдоогүй ч hash бодно: хариуны хугацаагаар бүртгэлтэй нэрийг таахгүй.
  if (!user) await hashPassword(body.password);
  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    await recordAttempts(db, limits);
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Нэр эсвэл нууц үг буруу');
  }
  const token = await createSession(db, user.id);
  trackActive(c, user.id);
  return c.json<AuthResponse>({ token, me: await loadMe(db, user.id) });
});

authRoutes.post('/logout', requireAuth, async (c) => {
  const token = bearerToken(c);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return c.body(null, 204);
});
