// Нөхөх салаа зам: даалгавар дуусахад RECOVERY_MIN_WRONG-оос цөөнгүй алдсан бол алдсан сэдвүүдээр
// өөр асуултууд бодуулж, бүгдийг зөв хариулсны дараа л тухайн хичээлийн дараагийн даалгавар нээгдэнэ.
import type { RecoveryAnswerResponse, RecoveryDto, Subject } from '../../../shared/types';
import { GAME, type Tier } from '../config/game';
import { TOPICS } from '../config/topics';
import { ApiError } from '../lib/errors';
import { OWN_GRADE } from './pool';

interface Missed {
  id: number;
  tier: Tier;
  topic: string | null;
  book_ref: string | null;
}

/**
 * Давтлагын асуулт алдсан асуулттай ижил хичээлийнх байна: сурах бичгийн хичээлээс үүссэн бол яг тэр хуудасны
 * (book_ref), үгүй бол ижил сэдвийн (topic). `topic` нь өргөн (6-р ангийн математикийн 63 хичээл 13 сэдэвт) тул
 * book_ref-тэй асуултад ашиглахгүй: ХИЕХ-д алдсан хүүхдэд анхны тооны бодлого өгөхгүй.
 */
const SAME_LESSON = '(q.book_ref = ? OR (? IS NULL AND q.topic = ?))';
const sameLessonArgs = (q: { book_ref: string | null; topic: string | null }) => [q.book_ref, q.book_ref, q.topic];

/** Алдсан асуултуудыг хичээлээр (book_ref, үгүй бол сэдвээр) бүлэглэнэ; аль нь ч үгүй асуулт бүр өөрийн бүлэгтэй. */
export function groupByLesson<T extends { id: number; topic: string | null; book_ref: string | null }>(missed: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const q of missed) {
    const key = q.book_ref ? `ref:${q.book_ref}` : (q.topic ?? `#${q.id}`);
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  return [...groups.values()];
}

/** Бүлэг бүрт сонгосон өөр асуултын араас дутууг алдсан асуултаар нөхнө (бүлэгт хамгийн ихдээ perTopic). */
export function practiceIds(groups: { missed: number[]; picked: number[] }[], perTopic: number = GAME.RECOVERY_PRACTICE): number[] {
  return groups.flatMap(({ missed, picked }) => [...picked.slice(0, perTopic), ...missed.slice(0, Math.max(0, perTopic - picked.length))]);
}

/** Ийм олон алдаа гарсан бол салаа зам заавал нээгдэнэ: зөв хариуг тэнд өөрөө дахин бодож олно. */
export const recoveryCertain = (wrong: number) => wrong >= GAME.RECOVERY_MIN_WRONG;

/**
 * Дуусах гэж буй даалгаврын салаа замын statement-ууд (хэрэггүй бол хоосон). Даалгаврыг дуусгах batch-д хамт
 * орно: шагнал олгогдоод салаа зам нээгдэхгүй үлдэх (эсвэл эсрэгээрээ) боломжгүй.
 */
export async function recoveryStatements(db: D1Database, userId: number, taskId: number, now = Date.now()): Promise<D1PreparedStatement[]> {
  const task = await db.prepare('SELECT subject FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, userId).first<{ subject: Subject }>();
  if (!task) return [];
  // Flag (-1) бол жинхэнэ алдаа биш.
  const { results: missed } = await db
    .prepare(
      `SELECT q.id, q.tier, q.topic, q.book_ref FROM task_questions tq JOIN questions q ON q.id = tq.question_id
       WHERE tq.task_id = ? AND tq.choice >= 0 AND tq.correct = 0 ORDER BY tq.position`,
    )
    .bind(taskId)
    .all<Missed>();
  if (!recoveryCertain(missed.length)) return [];

  const pick = db.prepare(
    `SELECT q.id FROM questions q
     LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
     WHERE q.tier = ? AND q.subject = ? AND ${SAME_LESSON} AND q.flagged = 0 AND ${OWN_GRADE}
       AND q.id NOT IN (SELECT question_id FROM task_questions WHERE task_id = ?)
     ORDER BY (s.seen_at IS NOT NULL), s.seen_at, RANDOM() LIMIT ?`,
  );
  const groups: { missed: number[]; picked: number[] }[] = [];
  for (const group of groupByLesson(missed)) {
    const first = group[0];
    const picked = (
      await pick.bind(userId, first.tier, task.subject, ...sameLessonArgs(first), userId, taskId, GAME.RECOVERY_PRACTICE).all<{ id: number }>()
    ).results.map((r) => r.id);
    groups.push({ missed: group.map((q) => q.id), picked });
  }

  // Шинэ асуултуудыг "харсан" болгоно: удахгүй ердийн даалгаварт дахин гарахгүй.
  const seen = db.prepare(
    `INSERT INTO seen_questions (user_id, question_id, seen_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
  );
  return [
    db
      .prepare('INSERT OR IGNORE INTO recoveries (task_id, user_id, subject, questions, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(taskId, userId, task.subject, JSON.stringify(practiceIds(groups)), now),
    ...groups.flatMap((g) => g.picked).map((id) => seen.bind(userId, id, now)),
  ];
}

export async function hasPendingRecovery(db: D1Database, userId: number, subject: Subject): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM recoveries WHERE user_id = ? AND subject = ? AND cleared_at IS NULL LIMIT 1')
    .bind(userId, subject)
    .first();
  return row !== null;
}

interface RecoveryRow {
  task_id: number;
  questions: string;
  passed: string;
  misses: number;
}

interface PracticeQuestion {
  id: number;
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string;
  tier: Tier;
  topic: string | null;
  book_ref: string | null;
}

async function pending(db: D1Database, userId: number, subject: Subject) {
  const row = await db
    .prepare('SELECT task_id, questions, passed, misses FROM recoveries WHERE user_id = ? AND subject = ? AND cleared_at IS NULL ORDER BY task_id DESC LIMIT 1')
    .bind(userId, subject)
    .first<RecoveryRow>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Давтлага алга');
  const { results: questions } = await db
    .prepare(
      `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation, q.tier, q.topic, q.book_ref
       FROM json_each(?) j JOIN questions q ON q.id = j.value ORDER BY j.key`,
    )
    .bind(row.questions)
    .all<PracticeQuestion>();
  const passed = JSON.parse(row.passed) as number[];
  return { row, questions, passed, current: questions.find((q) => !passed.includes(q.id)) ?? null };
}

function toDto(subject: Subject, questions: PracticeQuestion[], passed: number[]): RecoveryDto {
  const q = questions.find((x) => !passed.includes(x.id));
  const topic = q?.topic ? TOPICS[q.tier]?.[subject]?.find((t) => t.id === q.topic)?.name : undefined;
  return {
    subject,
    answered: questions.filter((x) => passed.includes(x.id)).length,
    total: questions.length,
    cleared: !q,
    // Зөв хариу, тайлбарыг энд хэзээ ч явуулахгүй.
    question: q ? { id: q.id, prompt: q.prompt, options: JSON.parse(q.options) as string[], ...(topic ? { topic } : {}) } : null,
  };
}

export async function loadRecovery(db: D1Database, userId: number, subject: Subject): Promise<RecoveryDto> {
  const p = await pending(db, userId, subject);
  return toDto(subject, p.questions, p.passed);
}

const STALE = () => new ApiError(409, 'ALREADY_ANSWERED', 'Энэ асуултад аль хэдийн хариулсан');

/**
 * Зөв бол тайлбарыг өгч, бүгд зөв болоход салаа зам хаагдана. Буруу бол дахин бодно; RECOVERY_MAX_MISSES дахь
 * буруугаас зөв хариу, тайлбарыг үзүүлээд асуултыг ижил сэдвийн өөр асуултаар солино (байхгүй бол хэвээр үлдэнэ),
 * тиймээс сонголтуудыг ээлжлэн дарж давах боломжгүй.
 */
export async function answerRecovery(
  db: D1Database,
  userId: number,
  subject: Subject,
  questionId: number,
  choice: number,
  now = Date.now(),
): Promise<RecoveryAnswerResponse> {
  const p = await pending(db, userId, subject);
  const q = p.current;
  if (!q || q.id !== questionId) throw STALE();
  // passed, misses-ийг өмнөх утгаар нь шалгаж давхар дарсан хариултыг тоолохгүй.
  const guard = 'WHERE task_id = ? AND passed = ? AND misses = ? AND cleared_at IS NULL';

  if (choice === q.correct_index) {
    const passed = [...p.passed, questionId];
    const done = p.questions.every((x) => passed.includes(x.id));
    const upd = await db
      .prepare(`UPDATE recoveries SET passed = ?, misses = 0, cleared_at = ? ${guard}`)
      .bind(JSON.stringify(passed), done ? now : null, p.row.task_id, p.row.passed, p.row.misses)
      .run();
    if (!upd.meta.changes) throw STALE();
    return { correct: true, explanation: q.explanation, recovery: toDto(subject, p.questions, passed) };
  }

  const misses = p.row.misses + 1;
  if (misses < GAME.RECOVERY_MAX_MISSES) {
    const upd = await db.prepare(`UPDATE recoveries SET misses = ? ${guard}`).bind(misses, p.row.task_id, p.row.passed, p.row.misses).run();
    if (!upd.meta.changes) throw STALE();
    return { correct: false, recovery: toDto(subject, p.questions, p.passed) };
  }

  // Ижил хичээлийн, салаа замд болон тэр даалгаварт ороогүй асуулт (хараагүйг түрүүлж)
  const next = await db
    .prepare(
      `SELECT q.id FROM questions q
       LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
       WHERE q.tier = ? AND q.subject = ? AND ${SAME_LESSON} AND q.flagged = 0 AND ${OWN_GRADE}
         AND q.id NOT IN (SELECT value FROM json_each(?))
         AND q.id NOT IN (SELECT question_id FROM task_questions WHERE task_id = ?)
       ORDER BY (s.seen_at IS NOT NULL), s.seen_at, RANDOM() LIMIT 1`,
    )
    .bind(userId, q.tier, subject, ...sameLessonArgs(q), userId, p.row.questions, p.row.task_id)
    .first<{ id: number }>();
  const ids = p.questions.map((x) => (x.id === q.id && next ? next.id : x.id));
  const [upd] = await db.batch([
    db.prepare(`UPDATE recoveries SET questions = ?, misses = 0 ${guard}`).bind(JSON.stringify(ids), p.row.task_id, p.row.passed, p.row.misses),
    ...(next
      ? [
          db
            .prepare(
              `INSERT INTO seen_questions (user_id, question_id, seen_at) VALUES (?, ?, ?)
               ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
            )
            .bind(userId, next.id, now),
        ]
      : []),
  ]);
  if (!upd.meta.changes) throw STALE();
  const after = next ? await pending(db, userId, subject) : p;
  return { correct: false, correctIndex: q.correct_index, explanation: q.explanation, recovery: toDto(subject, after.questions, after.passed) };
}
