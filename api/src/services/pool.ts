import { GAME, type Subject, type Tier } from '../config/game';
import type { Bindings } from '../env';
import { generateQuestions, pickProvider } from '../llm';
import type { QuestionDraft } from '../llm/types';
import { promptKey } from '../llm/validate';
import { type Excerpt, type PageRange, pickExcerpts, type Scope } from './grounding';

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
  /** Сурах бичгийн сангийн хэсэг ('math-7:45-46') ба номын анги; апп-д харагдахгүй. */
  book: Pick<Excerpt, 'ref' | 'grade'> | null = null,
): Promise<{ inserted: number; duplicates: number }> {
  if (drafts.length === 0) return { inserted: 0, duplicates: 0 };
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, book_ref, grade, topic, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  // Өмнө сэдэвгүй хадгалагдсан ижил асуултад (жишээ нь seed-ийг дахин import хийхэд) сэдвийг нөхнө.
  const fill = db.prepare('UPDATE questions SET topic = ? WHERE tier = ? AND subject = ? AND prompt_key = ? AND topic IS NULL');
  const results = await db.batch([
    ...drafts.map((d) =>
      stmt.bind(tier, subject, d.prompt, JSON.stringify(d.options), d.correctIndex, d.explanation, promptKey(d.prompt), source, book?.ref ?? null, book?.grade ?? null, d.topic ?? null, now),
    ),
    ...drafts.flatMap((d) => (d.topic ? [fill.bind(d.topic, tier, subject, promptKey(d.prompt))] : [])),
  ]);
  const inserted = results.slice(0, drafts.length).reduce((n, r) => n + (r.meta.changes ?? 0), 0);
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
  /** Асуулт зохиоход ашигласан сангийн хэсгүүд; хоосон бол хөтөлбөрийн сэдвээр үүсгэсэн. */
  grounded: string[];
}

/**
 * SQL: `q.book_ref` нь `range`-ийн хуудаснаас эхэлсэн эсэх (1/0); 'math-7:5-6' → math-7, 5. Утгууд: rangeArgs(range).
 */
export const IN_RANGE = 'COALESCE(substr(q.book_ref, 1, ?) = ? AND CAST(substr(q.book_ref, ?) AS INTEGER) BETWEEN ? AND ?, 0)';
export const rangeArgs = (r: PageRange) => [r.slug.length + 1, `${r.slug}:`, r.slug.length + 2, r.from, r.to];

/** tasks.lesson_ref: { slug: 'math-6', from: 10, to: 13 } ↔ 'math-6:10-13' */
export const lessonRef = (r: PageRange) => `${r.slug}:${r.from}-${r.to}`;
export function parseLessonRef(ref: string | null): PageRange | null {
  const m = ref ? /^([a-z0-9-]+):(\d+)-(\d+)$/.exec(ref) : null;
  return m ? { slug: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}

/**
 * SQL: хэрэглэгчид гарч болох асуулт — номгүй (түвшний нийтлэг) эсвэл өөрийнх нь ангийн номынх. Өөр ангийн
 * (анги нь тодорхойгүй) номын асуулт хэзээ ч гарахгүй. Утга: userId.
 */
export const OWN_GRADE = '(q.book_ref IS NULL OR q.grade = (SELECT grade FROM users WHERE id = ?))';

/**
 * Даалгаврын асуулт: хараагүйг санамсаргүйгээр, дутвал хамгийн эрт харсныг нь. Шатны хичээлийнх (харсан ч) үргэлж
 * түрүүлнэ: шатанд өөр сэдвийн асуулт зөвхөн хичээлд нэг даалгаварт хүрэлцэх асуулт байхгүй үед л орно.
 */
export const pickSql = (lesson: boolean) => `SELECT q.id FROM questions q
       LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND ${OWN_GRADE}
       ORDER BY ${lesson ? `${IN_RANGE} DESC,` : ''} (s.seen_at IS NOT NULL), s.seen_at, RANDOM()
       LIMIT ?`;

/** SQL: `range` хуудсанд үндэслэсэн (хэрэглэгчид гарч болох) асуултын тоо. Утгууд: tier, subject, ...rangeArgs. */
export const LESSON_COUNT_SQL = `SELECT COUNT(*) AS n FROM questions q
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND ${IN_RANGE}`;
/** pickSql-ийн утгууд. */
export const pickArgs = (userId: number, tier: Tier, subject: Subject, lesson: PageRange | null, limit: number) => [
  userId, tier, subject, userId, ...(lesson ? rangeArgs(lesson) : []), limit,
];

/**
 * `count` асуултыг `chunk`-аар хувааж LLM-ийг зэрэг дуудаад, шалгаж хадгална. Сурах бичгийн санд
 * тухайн хичээл, түвшний ном байвал дуудлага бүр сангийн өөр хэсэгт үндэслэнэ; `scope` өгвөл зөвхөн тэр ангийн
 * номд (`range` бол тэр хуудсуудад).
 */
export async function generateAndStore(
  env: Bindings,
  tier: Tier,
  subject: Subject,
  count: number,
  chunk: number = GAME.POOL.LLM_CHUNK,
  useBooks = true,
  scope: Scope | null = null,
): Promise<GenerateReport> {
  const { results } = await env.DB.prepare('SELECT prompt FROM questions WHERE tier = ? AND subject = ? ORDER BY id DESC')
    .bind(tier, subject)
    .all<{ prompt: string }>();
  const avoid = results.slice(0, 40).map((r) => r.prompt);
  const signatures = new Set(results.map((r) => mathSignature(r.prompt)).filter((x): x is string => x !== null));

  const sizes: number[] = [];
  for (let left = count; left > 0; left -= chunk) sizes.push(Math.min(chunk, left));
  const excerpts = useBooks ? await pickExcerpts(env, tier, subject, sizes.length, scope).catch(() => []) : [];
  // Номын хэсэг дуудлагын тооноос цөөн бол давтан ашиглана (тус бүр өөр асуулт гарна).
  const excerptOf = (i: number) => (excerpts.length ? excerpts[i % excerpts.length] : null);
  // Хичээлийн хуудсууд санд (уншигдахуйц) байхгүй бол номгүй асуулт зохиохгүй.
  const settled = scope?.range && excerpts.length === 0 ? [] : await Promise.allSettled(sizes.map((n, i) => generateQuestions(env, tier, subject, n, avoid, excerptOf(i))));

  const report: GenerateReport = {
    source: null,
    requested: count,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    rejectReasons: [],
    errors: [],
    grounded: [],
  };
  for (const [i, s] of settled.entries()) {
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
    const excerpt = excerptOf(i);
    const r = await insertDrafts(env.DB, tier, subject, fresh, s.value.source, Date.now(), excerpt);
    if (excerpt && r.inserted > 0) report.grounded.push(excerpt.ref);
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

/** Background нөхөлт (тухайн ангийн номоор): нэг анги (эсвэл нэг хичээлийн хуудсуудыг) зэрэг хоёр удаа нөхөхгүй. */
export async function refillPool(env: Bindings, tier: Tier, subject: Subject, scope: Scope): Promise<GenerateReport | null> {
  if (!pickProvider(env)) return null;
  const { range } = scope;
  const key = range ? `${subject}:${range.slug}:${range.from}` : `${subject}:${scope.grade}`;
  if (!(await tryLock(env.DB, tier, key, Date.now()))) return null;
  try {
    const count = range ? GAME.POOL.LLM_CHUNK : GAME.POOL.REFILL_BATCH;
    const report = await generateAndStore(env, tier, subject, count, GAME.POOL.LLM_CHUNK, true, scope);
    console.log(`[pool] refill tier=${tier} ${key}: +${report.inserted} (rejected ${report.rejected}) сан: ${report.grounded.join(', ') || '—'}`, report.errors);
    return report;
  } catch (e) {
    console.error('[pool] refill failed', e);
    return null;
  } finally {
    await env.DB.prepare('UPDATE pool_locks SET locked_until = 0 WHERE tier = ? AND subject = ?').bind(tier, key).run();
  }
}

/** Хэрэглэгчийн хараагүй, `range` хуудсанд үндэслэсэн асуулт нэг даалгаварт хүрэлцэхгүй бол тэр хуудсуудаар үүсгэнэ. */
export async function refillLesson(env: Bindings, tier: Tier, subject: Subject, scope: Scope & { range: PageRange }, userId: number): Promise<void> {
  const { range } = scope;
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM questions q LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
     WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND s.question_id IS NULL AND ${IN_RANGE}`,
  )
    .bind(userId, tier, subject, ...rangeArgs(range))
    .first<{ n: number }>();
  if ((row?.n ?? 0) < GAME.QUESTIONS_PER_TASK) await refillPool(env, tier, subject, scope);
}

/** Хэрэглэгчид гарч болох (өөрийн ангийн) хараагүй асуулт эсвэл нийт pool босгоос доош орсон бол background-д нөхнө. */
export async function maybeRefill(
  env: Bindings,
  ctx: { waitUntil(p: Promise<unknown>): void },
  tier: Tier,
  subject: Subject,
  userId: number,
  grade: number,
): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN s.question_id IS NULL THEN 1 ELSE 0 END) AS unseen
     FROM questions q LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
     WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND ${OWN_GRADE}`,
  )
    .bind(userId, tier, subject, userId)
    .first<{ total: number; unseen: number | null }>();
  const total = row?.total ?? 0;
  const unseen = row?.unseen ?? 0;
  if (total < GAME.POOL.MIN_TOTAL || unseen < GAME.POOL.MIN_UNSEEN) ctx.waitUntil(refillPool(env, tier, subject, { grade }));
}
