import { Hono } from 'hono';
import type { AuthResponse } from '../../../shared/types';
import { DEFAULT_EQUIPPED, GAME } from '../config/game';
import { tierForGrade } from '../domain/level';
import { ubDay } from '../domain/time';
import type { AppEnv } from '../env';
import { hashPassword, newSessionToken, sha256Hex } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { networkOf } from '../services/authLimits';
import { loadMe } from '../services/users';

export const judgeRoutes = new Hono<AppEnv>();

/**
 * Шүүгчээр орох (JUDGE_LOGIN = 'on'): нэр, нууц үг, асуулга, профайл бөглөхгүйгээр шинэ шүүгчийн бүртгэл үүсгэнэ.
 * Шүүгч (is_judge) тул дэлгүүрийн бүх хувцас, замын бүх цэг, шат, boss нээлттэй, амь хасагдахгүй (admin-ийн хэрэгсэлгүй). Шүүгч бүр
 * тусдаа бүртгэлтэй: бие биеийнхээ явцыг өөрчлөхгүй. Нууц үг нь санамсаргүй тул энэ төхөөрөмжөөс гарвал дахин нэвтрэхгүй.
 */
judgeRoutes.post('/', async (c) => {
  if (c.env.JUDGE_LOGIN !== 'on') throw new ApiError(404, 'NOT_FOUND', 'Шүүгчийн нэвтрэлт хаалттай байна');
  const db = c.env.DB;
  const now = Date.now();
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM users WHERE username LIKE 'judge\\_%' ESCAPE '\\' AND created_at > ?`)
    .bind(now - 24 * 60 * 60_000)
    .first<{ n: number }>();
  const n = recent?.n ?? 0;
  if (n >= GAME.JUDGE.DAILY_MAX) throw new ApiError(403, 'FORBIDDEN', 'Шүүгчийн бүртгэл хэт олон үүслээ. Дараа дахин оролдоно уу');
  const ipHash = await sha256Hex(networkOf(c.req.header('cf-connecting-ip')));
  const fromHere = await db
    .prepare('SELECT COUNT(*) AS n FROM judge_signups WHERE ip_hash = ? AND created_at > ?')
    .bind(ipHash, now - 24 * 60 * 60_000)
    .first<{ n: number }>();
  if ((fromHere?.n ?? 0) >= GAME.JUDGE.PER_NETWORK_DAILY) {
    throw new ApiError(429, 'JUDGE_LIMIT', 'Энэ сүлжээнээс шүүгчийн бүртгэл хэт олон үүслээ. Маргааш дахин оролдоно уу');
  }

  const tier = tierForGrade(GAME.JUDGE.GRADE);
  if (!tier) throw new ApiError(500, 'INTERNAL');
  const username = `judge_${newSessionToken().slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '0')}`;
  const passwordHash = await hashPassword(newSessionToken());
  const token = newSessionToken();
  const tokenHash = await sha256Hex(token);
  // Асуулга (хичээл) бөглөсөн, профайлын нэртэй: апп асуулга, профайл үүсгэх дэлгэцийг алгасна.
  await db.batch([
    db
      .prepare(
        `INSERT INTO users (username, password_hash, display_name, grade, tier, points, equipped, created_at, onboarding, is_judge)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        username,
        passwordHash,
        `Шүүгч ${n + 1}`,
        GAME.JUDGE.GRADE,
        tier,
        GAME.JUDGE.POINTS,
        JSON.stringify(DEFAULT_EQUIPPED),
        now,
        JSON.stringify({ subject: 'math' }),
      ),
    db
      .prepare(
        `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
         SELECT id, ?, 'signup_bonus', 'user', id, ? FROM users WHERE username = ?`,
      )
      .bind(GAME.JUDGE.POINTS, now, username),
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at) SELECT ?, id, ? FROM users WHERE username = ?').bind(tokenHash, now, username),
    db
      .prepare('INSERT INTO user_activity (user_id, day, first_at) SELECT id, ?, ? FROM users WHERE username = ?')
      .bind(ubDay(now), now, username),
    db.prepare('INSERT INTO judge_signups (ip_hash, created_at) VALUES (?, ?)').bind(ipHash, now),
  ]);
  const row = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first<{ id: number }>();
  if (!row) throw new ApiError(500, 'INTERNAL');
  return c.json<AuthResponse>({ token, me: await loadMe(db, row.id, now) }, 201);
});
