// Нөхөх салаа зам: даалгавар дуусахад RECOVERY_MIN_WRONG-оос цөөнгүй алдсан бол алдсан сэдвүүдээр
// өөр асуултууд бодуулж, бүгдийг зөв хариулсны дараа л тухайн хичээлийн дараагийн даалгавар нээгдэнэ.
import type { RecoveryAnswerResponse, RecoveryDto, Subject } from '../../../shared/types';
import { GAME, type Tier } from '../config/game';
import { TOPICS } from '../config/topics';
import { ApiError } from '../lib/errors';

interface Missed {
  id: number;
  tier: Tier;
  topic: string | null;
}

/** Алдсан асуултуудыг сэдвээр бүлэглэнэ; сэдэвгүй асуулт бүр өөрийн бүлэгтэй. Дараалал хадгалагдана. */
export function groupByTopic<T extends { id: number; topic: string | null }>(missed: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const q of missed) {
    const key = q.topic ?? `#${q.id}`;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  return [...groups.values()];
}

/** Бүлэг бүрт сонгосон өөр асуултын араас дутууг алдсан асуултаар нөхнө (бүлэгт хамгийн ихдээ perTopic). */
export function practiceIds(groups: { missed: number[]; picked: number[] }[], perTopic: number = GAME.RECOVERY_PRACTICE): number[] {
  return groups.flatMap(({ missed, picked }) => [...picked.slice(0, perTopic), ...missed.slice(0, Math.max(0, perTopic - picked.length))]);
}

/** Дууссан даалгаварт салаа зам нээнэ (хэрэгтэй бол). Нээсэн эсэхийг буцаана. */
export async function openRecovery(db: D1Database, userId: number, taskId: number, now = Date.now()): Promise<boolean> {
  const task = await db.prepare('SELECT subject FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, userId).first<{ subject: Subject }>();
  if (!task) return false;
  // Flag (-1) бол жинхэнэ алдаа биш.
  const { results: missed } = await db
    .prepare(
      `SELECT q.id, q.tier, q.topic FROM task_questions tq JOIN questions q ON q.id = tq.question_id
       WHERE tq.task_id = ? AND tq.choice >= 0 AND tq.correct = 0 ORDER BY tq.position`,
    )
    .bind(taskId)
    .all<Missed>();
  if (missed.length < GAME.RECOVERY_MIN_WRONG) return false;

  const pick = db.prepare(
    `SELECT q.id FROM questions q
     LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
     WHERE q.tier = ? AND q.subject = ? AND q.topic = ? AND q.flagged = 0
       AND q.id NOT IN (SELECT question_id FROM task_questions WHERE task_id = ?)
     ORDER BY (s.seen_at IS NOT NULL), s.seen_at, RANDOM() LIMIT ?`,
  );
  const groups: { missed: number[]; picked: number[] }[] = [];
  for (const group of groupByTopic(missed)) {
    const { tier, topic } = group[0];
    const picked =
      topic === null
        ? []
        : (await pick.bind(userId, tier, task.subject, topic, taskId, GAME.RECOVERY_PRACTICE).all<{ id: number }>()).results.map((r) => r.id);
    groups.push({ missed: group.map((q) => q.id), picked });
  }

  // Шинэ асуултуудыг "харсан" болгоно: удахгүй ердийн даалгаварт дахин гарахгүй.
  const seen = db.prepare(
    `INSERT INTO seen_questions (user_id, question_id, seen_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
  );
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO recoveries (task_id, user_id, subject, questions, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(taskId, userId, task.subject, JSON.stringify(practiceIds(groups)), now),
    ...groups.flatMap((g) => g.picked).map((id) => seen.bind(userId, id, now)),
  ]);
  return true;
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
}

interface PracticeQuestion {
  id: number;
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string;
  tier: Tier;
  topic: string | null;
}

async function pending(db: D1Database, userId: number, subject: Subject) {
  const row = await db
    .prepare('SELECT task_id, questions, passed FROM recoveries WHERE user_id = ? AND subject = ? AND cleared_at IS NULL ORDER BY task_id DESC LIMIT 1')
    .bind(userId, subject)
    .first<RecoveryRow>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Нөхөх салаа зам алга');
  const { results: questions } = await db
    .prepare(
      `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation, q.tier, q.topic
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

/** Буруу бол юу ч өөрчлөхгүй (дахин бодно); зөв бол тайлбарыг өгч, бүгд зөв болоход салаа зам хаагдана. */
export async function answerRecovery(
  db: D1Database,
  userId: number,
  subject: Subject,
  questionId: number,
  choice: number,
  now = Date.now(),
): Promise<RecoveryAnswerResponse> {
  const p = await pending(db, userId, subject);
  if (!p.current || p.current.id !== questionId) throw new ApiError(409, 'ALREADY_ANSWERED', 'Энэ асуултад аль хэдийн хариулсан');
  if (choice !== p.current.correct_index) return { correct: false, recovery: toDto(subject, p.questions, p.passed) };

  const passed = [...p.passed, questionId];
  const done = p.questions.every((q) => passed.includes(q.id));
  // passed-ийг өмнөх утгаар нь шалгаж давхар дарсан хариултыг тоолохгүй.
  const upd = await db
    .prepare('UPDATE recoveries SET passed = ?, cleared_at = ? WHERE task_id = ? AND passed = ? AND cleared_at IS NULL')
    .bind(JSON.stringify(passed), done ? now : null, p.row.task_id, p.row.passed)
    .run();
  if (!upd.meta.changes) throw new ApiError(409, 'ALREADY_ANSWERED', 'Энэ асуултад аль хэдийн хариулсан');
  return { correct: true, explanation: p.current.explanation, recovery: toDto(subject, p.questions, passed) };
}
