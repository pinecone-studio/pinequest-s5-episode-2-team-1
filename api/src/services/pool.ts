import { GAME, type Subject, type Tier } from '../config/game';
import type { Bindings } from '../env';
import { generateQuestions, pickProvider } from '../llm';
import type { QuestionDraft } from '../llm/types';
import { promptKey } from '../llm/validate';

/**
 * Тоо, хувьсагч, үйлдлийн дараалал ("5x-8=22", "2.4:0.6+1.5"). Үг хэллэг нь өөр ч бодлого нь ижил
 * асуултыг (зэрэгцээ LLM дуудлагаас гарсан) таних зорилготой; тоогүй/богино бол null.
 */
export function mathSignature(prompt: string): string | null {
  const sig = prompt
    .replace(/-(?=[\u0400-\u04FF])/g, ' ') // "ХИЕХ-ийг", "5-ыг" гэх мэт нөхцөлийн зураас
    .replace(/(\d)[.,](\d)/g, '$1§$2') // аравтын бутархайн цэгийг хадгална
    .replace(/[^0-9a-zA-Z§+\-−*/:=·×²³()]/g, '');
  return /\d/.test(sig) && sig.length >= 5 ? sig : null;
}

/** Давхардсаныг (tier, subject, prompt_key UNIQUE) чимээгүй алгасаж хадгална. */
export async function insertDrafts(
  db: D1Database,
  tier: number,
  subject: string,
  drafts: QuestionDraft[],
  source: string,
  now = Date.now(),
): Promise<{ inserted: number; duplicates: number }> {
  if (drafts.length === 0) return { inserted: 0, duplicates: 0 };
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const results = await db.batch(
    drafts.map((d) =>
      stmt.bind(tier, subject, d.prompt, JSON.stringify(d.options), d.correctIndex, d.explanation, promptKey(d.prompt), source, now),
    ),
  );
  const inserted = results.reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  return { inserted, duplicates: drafts.length - inserted };
}

export interface GenerateReport {
  source: string | null;
  requested: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  rejectReasons: string[];
  errors: string[];
}

/** `count` асуултыг `chunk`-аар хувааж LLM-ийг зэрэг дуудаад, шалгаж хадгална. */
export async function generateAndStore(
  env: Bindings,
  tier: Tier,
  subject: Subject,
  count: number,
  chunk: number = GAME.POOL.LLM_CHUNK,
): Promise<GenerateReport> {
  const { results } = await env.DB.prepare('SELECT prompt FROM questions WHERE tier = ? AND subject = ? ORDER BY id DESC')
    .bind(tier, subject)
    .all<{ prompt: string }>();
  const avoid = results.slice(0, 40).map((r) => r.prompt);
  const signatures = new Set(results.map((r) => mathSignature(r.prompt)).filter((x): x is string => x !== null));

  const sizes: number[] = [];
  for (let left = count; left > 0; left -= chunk) sizes.push(Math.min(chunk, left));
  const settled = await Promise.allSettled(sizes.map((n) => generateQuestions(env, tier, subject, n, avoid)));

  const report: GenerateReport = { source: null, requested: count, inserted: 0, duplicates: 0, rejected: 0, rejectReasons: [], errors: [] };
  for (const s of settled) {
    if (s.status === 'rejected') {
      report.errors.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
      continue;
    }
    report.source = s.value.source;
    report.rejected += s.value.rejected.length;
    report.rejectReasons.push(...s.value.rejected.map((r) => r.reason));
    const fresh = s.value.drafts.filter((d) => {
      const sig = mathSignature(d.prompt);
      if (sig === null) return true;
      if (signatures.has(sig)) return false;
      signatures.add(sig);
      return true;
    });
    const r = await insertDrafts(env.DB, tier, subject, fresh, s.value.source);
    report.inserted += r.inserted;
    report.duplicates += r.duplicates + (s.value.drafts.length - fresh.length);
  }
  return report;
}

async function tryLock(db: D1Database, tier: number, subject: string, now: number): Promise<boolean> {
  const r = await db
    .prepare(
      `INSERT INTO pool_locks (tier, subject, locked_until) VALUES (?, ?, ?)
       ON CONFLICT (tier, subject) DO UPDATE SET locked_until = excluded.locked_until
       WHERE pool_locks.locked_until < ?`,
    )
    .bind(tier, subject, now + GAME.POOL.LOCK_MS, now)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Background нөхөлт: нэг хослолыг зэрэг хоёр удаа нөхөхгүй. */
export async function refillPool(env: Bindings, tier: Tier, subject: Subject): Promise<GenerateReport | null> {
  if (!pickProvider(env)) return null;
  if (!(await tryLock(env.DB, tier, subject, Date.now()))) return null;
  try {
    const report = await generateAndStore(env, tier, subject, GAME.POOL.REFILL_BATCH);
    console.log(`[pool] refill tier=${tier} ${subject}: +${report.inserted} (rejected ${report.rejected})`, report.errors);
    return report;
  } catch (e) {
    console.error('[pool] refill failed', e);
    return null;
  } finally {
    await env.DB.prepare('UPDATE pool_locks SET locked_until = 0 WHERE tier = ? AND subject = ?').bind(tier, subject).run();
  }
}

/** Хэрэглэгчийн хараагүй асуулт эсвэл нийт pool босгоос доош орсон бол background-д нөхнө. */
export async function maybeRefill(
  env: Bindings,
  ctx: { waitUntil(p: Promise<unknown>): void },
  tier: Tier,
  subject: Subject,
  userId: number,
): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN s.question_id IS NULL THEN 1 ELSE 0 END) AS unseen
     FROM questions q LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
     WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0`,
  )
    .bind(userId, tier, subject)
    .first<{ total: number; unseen: number | null }>();
  const total = row?.total ?? 0;
  const unseen = row?.unseen ?? 0;
  if (total < GAME.POOL.MIN_TOTAL || unseen < GAME.POOL.MIN_UNSEEN) ctx.waitUntil(refillPool(env, tier, subject));
}
