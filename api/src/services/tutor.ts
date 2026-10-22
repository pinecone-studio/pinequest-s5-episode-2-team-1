import { GAME, type Subject } from '../config/game';
import { ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import type { MissedQuestion, TutorContext } from '../llm/live';
import { recoveryCertain } from './recovery';

interface Row {
  question_id: number;
  subject: Subject;
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string;
  choice: number;
  correct: number | null;
  /** Тухайн даалгаврын алдсан асуултын тоо (flag тооцохгүй). */
  task_wrong: number;
  /** Салаа зам нь дууссан эсэх; салаа зам үүсээгүй бол null. */
  recovery_cleared: number | null;
}

const toMissed = (r: Row): MissedQuestion => ({
  subject: r.subject,
  prompt: r.prompt,
  options: JSON.parse(r.options) as string[],
  correctIndex: r.correct_index,
  choice: r.choice,
  explanation: r.explanation,
  // Апп answerTask-тай адил: 2+ алдсан даалгаврын буруу хариултын зөв хариуг салаа зам дуустал нууна.
  hideAnswer: r.correct !== 1 && recoveryCertain(r.task_wrong) && r.recovery_cleared !== 1,
});

const SELECT = `SELECT tq.question_id, q.subject, q.prompt, q.options, q.correct_index, q.explanation, tq.choice, tq.correct,
    (SELECT COUNT(*) FROM task_questions w WHERE w.task_id = tq.task_id AND w.choice >= 0 AND w.correct = 0) AS task_wrong,
    (SELECT r.cleared_at IS NOT NULL FROM recoveries r WHERE r.task_id = tq.task_id) AS recovery_cleared
  FROM task_questions tq
  JOIN tasks t ON t.id = tq.task_id
  JOIN questions q ON q.id = tq.question_id`;

/**
 * Баавгайд өгөх бодлогууд. questionId өгвөл зөвхөн хүүхдийн аль хэдийн хариулсан бодлого байх ёстой:
 * хариулаагүй асуултын зөв хариуг баавгайгаас асууж болохгүй.
 */
export async function loadTutorContext(db: D1Database, userId: number, questionId?: number): Promise<TutorContext> {
  const user = await db.prepare('SELECT grade FROM users WHERE id = ?').bind(userId).first<{ grade: number }>();
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Хэрэглэгч олдсонгүй');

  if (questionId !== undefined) {
    const row = await db
      .prepare(`${SELECT} WHERE t.user_id = ? AND tq.question_id = ? AND tq.choice IS NOT NULL ORDER BY tq.answered_at DESC LIMIT 1`)
      .bind(userId, questionId)
      .first<Row>();
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Энэ бодлогод хараахан хариулаагүй байна');
    return { grade: user.grade, questions: [toMissed(row)], focused: true };
  }

  // Нэг асуулт хэд хэдэн даалгаварт орсон байж болох тул илүү авч давхардлыг хасна.
  const { results } = await db
    .prepare(`${SELECT} WHERE t.user_id = ? AND tq.correct = 0 AND tq.choice >= 0 ORDER BY tq.answered_at DESC LIMIT ?`)
    .bind(userId, GAME.TUTOR.RECENT_MISSES * 3)
    .all<Row>();
  const seen = new Set<number>();
  const recent = results.filter((r) => !seen.has(r.question_id) && seen.add(r.question_id)).slice(0, GAME.TUTOR.RECENT_MISSES);
  return { grade: user.grade, questions: recent.map(toMissed), focused: false };
}

/** Сервер гэнэт зогссон бол `ended_at` NULL үлддэг: ийм хугацаанаас хуучин ярилцлагыг идэвхтэй гэж тооцохгүй. */
const ACTIVE_WINDOW_MS = GAME.TUTOR.MAX_SESSION_MS + 60_000;

/**
 * Ярилцлагыг бүртгэнэ. Өдрийн хязгаар ба зэрэг ярилцлагыг INSERT дотор шалгана: зэрэг ирсэн хүсэлт хязгаарыг давахгүй.
 * Буцаасан id-г endTutorSession-д өгнө.
 */
export async function startTutorSession(db: D1Database, userId: number, now = Date.now()): Promise<number> {
  const day = ubDay(now);
  const activeSince = now - ACTIVE_WINDOW_MS;
  const row = await db
    .prepare(
      `INSERT INTO tutor_sessions (user_id, day, started_at)
       SELECT ?, ?, ?
       WHERE (SELECT COUNT(*) FROM tutor_sessions WHERE user_id = ? AND day = ?) < ?
         AND (SELECT COUNT(*) FROM tutor_sessions WHERE user_id = ? AND ended_at IS NULL AND started_at > ?) < ?
       RETURNING id`,
    )
    .bind(userId, day, now, userId, day, GAME.TUTOR.DAILY_SESSIONS, userId, activeSince, GAME.TUTOR.MAX_ACTIVE)
    .first<{ id: number }>();
  if (row) return row.id;

  const active = await db
    .prepare('SELECT COUNT(*) AS n FROM tutor_sessions WHERE user_id = ? AND ended_at IS NULL AND started_at > ?')
    .bind(userId, activeSince)
    .first<{ n: number }>();
  if ((active?.n ?? 0) >= GAME.TUTOR.MAX_ACTIVE) {
    throw new ApiError(409, 'TUTOR_LIMIT', 'Баавгай өөр дэлгэц дээр чамтай ярьж байна. Тэр ярилцлагаа дуусгаад дахин оролдоорой.');
  }
  throw new ApiError(429, 'TUTOR_LIMIT', `Өнөөдрийн ${GAME.TUTOR.DAILY_SESSIONS} ярилцлага дууслаа. Маргааш дахин ярилцъя!`);
}

/** Ярилцлага дууссан. Gemini-тэй холбогдож чадаагүй бол (counted = false) тоолохгүйн тулд устгана. */
export async function endTutorSession(db: D1Database, id: number, counted: boolean, now = Date.now()): Promise<void> {
  await (counted
    ? db.prepare('UPDATE tutor_sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL').bind(now, id)
    : db.prepare('DELETE FROM tutor_sessions WHERE id = ?').bind(id)
  ).run();
}
