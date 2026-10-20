import { Hono } from 'hono';
import { z } from 'zod';
import { GAME, SUBJECTS, type Subject, type Tier } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, parseId, readBody } from '../lib/errors';
import { pickProvider } from '../llm';
import { validateDrafts } from '../llm/validate';
import { generateAndStore, insertDrafts } from '../services/pool';

// Зөвхөн хөгжүүлэлт, seed скрипт, duel-bot-д. `X-Admin-Token` = ADMIN_TOKEN (.dev.vars).
export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', async (c, next) => {
  const expected = c.env.ADMIN_TOKEN;
  if (!expected || c.req.header('x-admin-token') !== expected) throw new ApiError(403, 'FORBIDDEN', 'Admin token буруу');
  await next();
});

const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const subjectSchema = z.enum(SUBJECTS);

adminRoutes.post('/generate', async (c) => {
  const body = await readBody(
    c,
    z.object({
      tier: tierSchema,
      subject: subjectSchema,
      count: z.number().int().min(1).max(40).default(10),
      chunk: z.number().int().min(1).max(10).default(GAME.POOL.LLM_CHUNK),
    }),
  );
  if (!pickProvider(c.env)) {
    throw new ApiError(503, 'LLM_UNAVAILABLE', 'GEMINI_API_KEY (.dev.vars) эсвэл `npm run dev:ai` (Workers AI) хэрэгтэй');
  }
  const report = await generateAndStore(c.env, body.tier, body.subject, body.count, body.chunk);
  if (report.inserted === 0 && report.errors.length > 0) throw new ApiError(502, 'LLM_FAILED', report.errors[0]);
  return c.json(report);
});

/** Бэлэн асуулт (seed/fixtures.json) оруулах. */
adminRoutes.post('/import', async (c) => {
  const body = await readBody(
    c,
    z.object({
      source: z.string().default('fixture'),
      questions: z.array(z.looseObject({ tier: tierSchema, subject: subjectSchema })),
    }),
  );
  const groups = new Map<string, { tier: Tier; subject: Subject; items: unknown[] }>();
  for (const q of body.questions) {
    const key = `${q.tier}:${q.subject}`;
    const g = groups.get(key) ?? { tier: q.tier, subject: q.subject, items: [] };
    g.items.push(q);
    groups.set(key, g);
  }
  let inserted = 0;
  let duplicates = 0;
  let rejected = 0;
  for (const g of groups.values()) {
    const v = validateDrafts(g.items);
    rejected += v.rejected.length;
    const r = await insertDrafts(c.env.DB, g.tier, g.subject, v.drafts, body.source);
    inserted += r.inserted;
    duplicates += r.duplicates;
  }
  return c.json({ inserted, duplicates, rejected });
});

adminRoutes.get('/pool', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tier, subject, SUM(CASE WHEN flagged = 0 THEN 1 ELSE 0 END) AS active, SUM(flagged) AS flagged
     FROM questions GROUP BY tier, subject ORDER BY tier, subject`,
  ).all<{ tier: number; subject: string; active: number; flagged: number }>();
  return c.json({ provider: pickProvider(c.env), pool: results });
});

/** duel-bot-ын `--accuracy` горимд: асуултын зөв хариу. */
adminRoutes.get('/questions/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT id, correct_index FROM questions WHERE id = ?')
    .bind(parseId(c.req.param('id')))
    .first<{ id: number; correct_index: number }>();
  if (!row) throw new ApiError(404, 'NOT_FOUND');
  return c.json({ id: row.id, correctIndex: row.correct_index });
});

/** Flag-ийг буцаах (e2e тестийн дараа, эсвэл андуурч дарсан үед). */
adminRoutes.post('/questions/:id/unflag', async (c) => {
  await c.env.DB.prepare('UPDATE questions SET flagged = 0, flagged_by = NULL WHERE id = ?').bind(parseId(c.req.param('id'))).run();
  return c.json({ ok: true });
});

/** e2e-д "цаг хугацаа" дуурайх: хэрэглэгчийн streak/хамгаалалтын төлөвийг шууд тавина. */
adminRoutes.post('/debug/users/:id/streak', async (c) => {
  const body = await readBody(
    c,
    z.object({
      streak: z.number().int().min(0),
      lastDay: z.string().nullable(),
      shieldHeld: z.number().int().min(0).max(1).default(0),
      shieldBoughtDay: z.string().nullable().default(null),
    }),
  );
  await c.env.DB.prepare(
    'UPDATE users SET streak = ?, last_streak_day = ?, shield_held = ?, shield_bought_day = ?, shield_used_day = NULL WHERE id = ?',
  )
    .bind(body.streak, body.lastDay, body.shieldHeld, body.shieldBoughtDay, parseId(c.req.param('id')))
    .run();
  return c.json({ ok: true });
});

/** Оноо ба point_ledger-ийн нийлбэр зөрсөн хэрэглэгчид (e2e шалгалтад). */
adminRoutes.get('/audit', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.points, COALESCE(SUM(l.delta), 0) AS ledger
     FROM users u LEFT JOIN point_ledger l ON l.user_id = u.id
     GROUP BY u.id HAVING u.points != ledger`,
  ).all();
  return c.json({ mismatches: results });
});
