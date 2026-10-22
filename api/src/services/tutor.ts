import { GAME, type Subject } from '../config/game';
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
