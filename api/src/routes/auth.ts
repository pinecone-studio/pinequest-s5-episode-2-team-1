import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResponse, LessonsResponse, MeResponse, MyProfileResponse, OnboardingBody } from '../../../shared/types';
import { HEARD_FROM, REASONS, SELF_LEVELS } from '../../../shared/onboarding';
import { BEAR_FACES, BEAR_FURS } from '../config/cosmetics';
import { ACTIVE_SUBJECTS, DEFAULT_EQUIPPED, GAME } from '../config/game';
import { tierForGrade } from '../domain/level';
import { ubDay } from '../domain/time';
import type { AppEnv } from '../env';
import { hashPassword, newSessionToken, normalizeUsername, sha256Hex, usernameError, verifyPassword } from '../lib/auth';
import { ApiError, readBody } from '../lib/errors';
import { bearerToken, createSession, requireAuth, trackActive } from '../lib/session';
import { loadLessons } from '../services/lessons';
import { myProfile, rotateProfileCode, setAdminGrade, setAvatar, setBearLook, setOnboarding } from '../services/profiles';
import { loadMe } from '../services/users';

const registerSchema = z.object({
  username: z.string(),
  password: z.string().min(GAME.AUTH.PASSWORD_MIN).max(GAME.AUTH.PASSWORD_MAX),
  // шинэ апп ангийг onboarding-д асуудаг (тэр хүртэл GRADE_MIN); хуучин апп бүртгэлдээ илгээнэ
  grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX).default(GAME.GRADE_MIN),
  onboarded: z.boolean().default(true),
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
  const passwordHash = await hashPassword(body.password);
  const token = newSessionToken();
  const tokenHash = await sha256Hex(token);

  // Хэрэглэгч, эхлэх онооны ledger, session, өнөөдрийн идэвх (dashboard)-ийг нэг batch-аар (атомик) үүсгэнэ.
  try {
    await db.batch([
      db
        .prepare('INSERT INTO users (username, password_hash, grade, tier, points, equipped, created_at, onboarding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(username, passwordHash, body.grade, tier, GAME.START_POINTS, JSON.stringify(DEFAULT_EQUIPPED), now, body.onboarded ? '{}' : null),
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

/**
 * Шүүгчээр орох (JUDGE_LOGIN = 'on'): нэр, нууц үг, асуулга, профайл бөглөхгүйгээр шинэ шүүгчийн бүртгэл үүсгэнэ.
 * Admin тул дэлгүүрийн бүх хувцас, замын бүх цэг, шат, boss нээлттэй, амь хасагдахгүй. Шүүгч бүр тусдаа бүртгэлтэй:
 * бие биеийнхээ явцыг өөрчлөхгүй. Нууц үг нь санамсаргүй тул энэ төхөөрөмжөөс гарвал дахин нэвтрэхгүй.
 */
authRoutes.post('/judge', async (c) => {
  if (c.env.JUDGE_LOGIN !== 'on') throw new ApiError(404, 'NOT_FOUND', 'Шүүгчийн нэвтрэлт хаалттай байна');
  const db = c.env.DB;
  const now = Date.now();
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM users WHERE username LIKE 'judge\\_%' ESCAPE '\\' AND created_at > ?`)
    .bind(now - 24 * 60 * 60_000)
    .first<{ n: number }>();
  const n = recent?.n ?? 0;
  if (n >= GAME.JUDGE.DAILY_MAX) throw new ApiError(403, 'FORBIDDEN', 'Шүүгчийн бүртгэл хэт олон үүслээ. Дараа дахин оролдоно уу');

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
        `INSERT INTO users (username, password_hash, display_name, grade, tier, points, equipped, created_at, onboarding, is_admin)
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
  ]);
  const row = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first<{ id: number }>();
  if (!row) throw new ApiError(500, 'INTERNAL');
  return c.json<AuthResponse>({ token, me: await loadMe(db, row.id, now) }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await readBody(c, loginSchema);
  const db = c.env.DB;
  const user = await db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .bind(normalizeUsername(body.username))
    .first<{ id: number; password_hash: string }>();
  // Нэр олдоогүй ч hash бодно: хариуны хугацаагаар бүртгэлтэй нэрийг таахгүй.
  if (!user) await hashPassword(body.password);
  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
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

export const meRoutes = new Hono<AppEnv>();

meRoutes.get('/', requireAuth, async (c) => {
  return c.json<MeResponse>({ me: await loadMe(c.env.DB, c.get('userId')) });
});

/** Сурах замын хичээлүүд: хэрэглэгчийн ангийн сурах бичгийн гарчгаас. */
meRoutes.get('/lessons/:subject', requireAuth, async (c) => {
  const subject = z.enum(ACTIVE_SUBJECTS).safeParse(c.req.param('subject'));
  if (!subject.success) throw new ApiError(400, 'BAD_REQUEST', 'Буруу хичээл');
  const user = await c.env.DB.prepare('SELECT grade FROM users WHERE id = ?').bind(c.get('userId')).first<{ grade: number }>();
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Нэвтрэх шаардлагатай');
  return c.json<LessonsResponse>(await loadLessons(c.env, subject.data, user.grade));
});

/** Миний профайл (бусдад ингэж харагдана) ба хуваалцах код. */
meRoutes.get('/profile', requireAuth, async (c) => c.json<MyProfileResponse>(await myProfile(c.env.DB, c.get('userId'))));

/** Кодоо солино: хуучин кодоор профайл олдохоо болино. */
meRoutes.post('/profile/code', requireAuth, async (c) => c.json<MyProfileResponse>(await rotateProfileCode(c.env.DB, c.get('userId'))));

/** Нүүрэн дээр сонгосон дэвсгэр, хувцас (профайл дээр бусдад харагдана). */
meRoutes.put('/look', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ bg: z.string().min(1).max(40), outfit: z.string().min(1).max(400) }));
  return c.json<MeResponse>({ me: await setBearLook(c.env.DB, c.get('userId'), body) });
});

/** Анх орохдоо асуудаг асуултын хариулт (анги нь зөвхөн анх удаа хэрэгжинэ). */
meRoutes.put('/onboarding', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({
      grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX),
      subject: z.enum(ACTIVE_SUBJECTS),
      heardFrom: z.enum(HEARD_FROM).optional(),
      reason: z.enum(REASONS).optional(),
      level: z.number().int().refine((v) => (SELF_LEVELS as readonly number[]).includes(v)).optional(),
    }),
  );
  const tier = tierForGrade(body.grade);
  if (!tier) throw new ApiError(400, 'BAD_REQUEST', 'Анги буруу');
  return c.json<MeResponse>({ me: await setOnboarding(c.env.DB, c.get('userId'), body as OnboardingBody, tier) });
});

/** Хөгжүүлэгчийн бүртгэлээр 6–12-р ангийн агуулгыг шалгана. */
meRoutes.put('/grade', requireAuth, async (c) => {
  const { grade } = await readBody(
    c,
    z.object({ grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX) }),
  );
  return c.json<MeResponse>({ me: await setAdminGrade(c.env.DB, c.get('userId'), grade) });
});

/** Профайлын нэр (хоч) ба баавгайн үс, царай, цээжний толбо. */
meRoutes.put('/avatar', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({
      // хоч: зай, кирилл зөвшөөрнө; удирдах тэмдэгт (шинэ мөр г.м.) үгүй
      name: z
        .string()
        .trim()
        .min(1)
        .max(GAME.AUTH.USERNAME_MAX)
        .regex(/^[^\p{C}]+$/u),
      fur: z.enum(BEAR_FURS),
      face: z.enum(BEAR_FACES),
      chest: z.boolean(),
    }),
  );
  return c.json<MeResponse>({ me: await setAvatar(c.env.DB, c.get('userId'), body) });
});
