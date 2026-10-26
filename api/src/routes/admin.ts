import { Hono } from 'hono';
import { z } from 'zod';
import type { AdminStatsResponse } from '../../../shared/types';
import { GAME, SUBJECTS, type Subject, type Tier } from '../config/game';
import { topicIds } from '../config/topics';
import type { AppEnv } from '../env';
import { sha256Hex } from '../lib/auth';
import { ApiError, parseId, readBody } from '../lib/errors';
import { pickProvider } from '../llm';
import { validateDrafts } from '../llm/validate';
import { pickExcerpts } from '../services/grounding';
import { generateAndStore, insertDrafts } from '../services/pool';
import { loadStats } from '../services/stats';
import { bookRoutes } from './books';

// Зөвхөн хөгжүүлэлт, seed скрипт, duel-bot-д. `X-Admin-Token` = ADMIN_TOKEN (.dev.vars).
export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', async (c, next) => {
  const expected = c.env.ADMIN_TOKEN;
  // Hash-ийг харьцуулна: мөрийн шууд харьцуулалт шиг хугацаагаараа token-ийг задлахгүй.
  const ok = !!expected && (await sha256Hex(c.req.header('x-admin-token') ?? '')) === (await sha256Hex(expected));
  if (!ok) throw new ApiError(403, 'FORBIDDEN', 'Admin token буруу');
  await next();
});

/** Сурах бичгийн сан: /admin/books/* (routes/books.ts). */
adminRoutes.route('/books', bookRoutes);

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
      /** Энэ удаад өөр Gemini загвар ашиглах (seed скриптийн --model). */
      model: z.string().regex(/^[a-z0-9.-]+$/).optional(),
      /** false бол сурах бичгийн сангүйгээр, хөтөлбөрийн сэдвээр (seed скриптийн --no-books). */
      books: z.boolean().default(true),
    }),
  );
  if (!pickProvider(c.env)) {
    throw new ApiError(503, 'LLM_UNAVAILABLE', 'GEMINI_API_KEY (.env.local / .dev.vars) эсвэл `npm run dev:ai` (Workers AI) хэрэгтэй');
  }
  const env = body.model ? { ...c.env, GEMINI_MODEL: body.model } : c.env;
  const report = await generateAndStore(env, body.tier, body.subject, body.count, body.chunk, body.books);
  if (report.inserted === 0 && report.errors.length > 0) throw new ApiError(502, 'LLM_FAILED', report.errors[0]);
  return c.json(report);
});

/** Асуулт үүсгэхэд сангаас ямар хэсэг сонгогдохыг харах (LLM дуудахгүй): ?tier=1&subject=math */
adminRoutes.get('/excerpt', async (c) => {
  const tier = tierSchema.safeParse(Number(c.req.query('tier')));
  const subject = subjectSchema.safeParse(c.req.query('subject'));
  if (!tier.success || !subject.success) throw new ApiError(400, 'BAD_REQUEST', 'tier=1..3, subject=math|mongolian|physics');
  const [excerpt] = await pickExcerpts(c.env, tier.data, subject.data, 1);
  if (!excerpt) throw new ApiError(404, 'NOT_FOUND', 'Энэ хичээл, түвшинд сурах бичгийн санд ном алга');
  return c.json(excerpt);
});

/** Бэлэн асуулт (seed/fixtures.json) оруулах. */
/** 'math-6:7-9' → номын анги 6 (slug '<хичээл>-<анги>', migration 0012-той ижил); буруу бол null. */
export function bookOfRef(ref: unknown): { ref: string; grade: number } | null {
  if (typeof ref !== 'string') return null;
  const m = /^[a-z]+-(\d+)[a-z0-9-]*:\d+(?:-\d+)?$/.exec(ref);
  return m ? { ref, grade: Number(m[1]) } : null;
}

adminRoutes.post('/import', async (c) => {
  const body = await readBody(
    c,
    z.object({
      source: z.string().default('fixture'),
      questions: z.array(z.looseObject({ tier: tierSchema, subject: subjectSchema })),
    }),
  );
  // bookRef ('math-6:7-9'): сурах замын хичээлийн бодлого (seed/lesson-questions.json) тэр хуудас, номын ангитай хадгалагдана.
  const groups = new Map<string, { tier: Tier; subject: Subject; book: { ref: string; grade: number } | null; items: unknown[] }>();
  for (const q of body.questions) {
    const book = bookOfRef(q.bookRef);
    const key = `${q.tier}:${q.subject}:${book?.ref ?? ''}`;
    const g = groups.get(key) ?? { tier: q.tier, subject: q.subject, book, items: [] };
    g.items.push(q);
    groups.set(key, g);
  }
  let inserted = 0;
  let duplicates = 0;
  let rejected = 0;
  for (const g of groups.values()) {
    const v = validateDrafts(g.items, topicIds(g.tier, g.subject));
    rejected += v.rejected.length;
    const r = await insertDrafts(c.env.DB, g.tier, g.subject, v.drafts, body.source, Date.now(), g.book);
    inserted += r.inserted;
    duplicates += r.duplicates;
  }
  return c.json({ inserted, duplicates, rejected });
});

/** Admin dashboard (/dashboard)-ын тоо: ?days=7..90 (анхдагч 30), өдрүүд UB цагаар. */
adminRoutes.get('/stats', async (c) => {
  const days = z.coerce.number().int().min(7).max(90).safeParse(c.req.query('days') ?? 30);
  if (!days.success) throw new ApiError(400, 'BAD_REQUEST', 'days=7..90');
  c.header('Cache-Control', 'no-store');
  return c.json<AdminStatsResponse>(await loadStats(c.env.DB, days.data));
});

adminRoutes.get('/pool', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tier, subject, SUM(CASE WHEN flagged = 0 THEN 1 ELSE 0 END) AS active, SUM(flagged) AS flagged
     FROM questions GROUP BY tier, subject ORDER BY tier, subject`,
  ).all<{ tier: number; subject: string; active: number; flagged: number }>();
  return c.json({ provider: pickProvider(c.env), pool: results });
});

/** Идэвхтэй (flag-гүй) асуултуудыг export хийх (seed/questions.json-д хадгалж git-д оруулна). */
adminRoutes.get('/export', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tier, subject, topic, prompt, options, correct_index, explanation, source
     FROM questions WHERE flagged = 0 ORDER BY tier, subject, id`,
  ).all<{ tier: number; subject: string; topic: string | null; prompt: string; options: string; correct_index: number; explanation: string; source: string }>();
  return c.json({
    questions: results.map((r) => ({
      tier: r.tier,
      subject: r.subject,
      ...(r.topic ? { topic: r.topic } : {}),
      prompt: r.prompt,
      options: JSON.parse(r.options) as string[],
      correctIndex: r.correct_index,
      explanation: r.explanation,
      source: r.source,
    })),
  });
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

/**
 * e2e-д сурах замыг шууд тавина: тухайн хичээлийн XP, давсан зангилаа (өгөөгүй бол 50 XP тутамд нэг) ба давсан
 * тулааны хаалганы тоо. Зангилаа нь дараагийн хаалганаас цааш гарахгүй (currentNode).
 */
adminRoutes.post('/debug/users/:id/path', async (c) => {
  const body = await readBody(
    c,
    z.object({
      subject: subjectSchema,
      xp: z.number().int().min(0),
      nodes: z.number().int().min(0).optional(),
      gatesBeaten: z.number().int().min(0).max(GAME.BOSS.GATES),
    }),
  );
  await c.env.DB.prepare(
    `INSERT INTO subject_progress (user_id, subject, xp, nodes, bosses_beaten) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, subject) DO UPDATE SET xp = excluded.xp, nodes = excluded.nodes, bosses_beaten = excluded.bosses_beaten`,
  )
    .bind(parseId(c.req.param('id')), body.subject, body.xp, body.nodes ?? Math.floor(body.xp / 50), body.gatesBeaten)
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
