// Өнөөдрийн хичээл: сонгосон хичээлийн хүүхдийн ангийн бодлогоос REVIEW_QUESTIONS-ийг санамсаргүй (хараагүйг түрүүлж)
// өгнө (нүүрний өнөөдрийн хичээлийн товч). Сурах замаас хамаарахгүй, замд нөлөөлөхгүй, давтлага үүсгэхгүй; буруу
// хариулбал амь хасагдана (амьгүй бол хаалттай); оноо, XP, дараалал ердийн даалгавар шиг.
import { SUBJECT_NOT_IN_GRADE_MESSAGE, subjectInGrade } from '../../../shared/subjects';
import type { TaskDto } from '../../../shared/types';
import { GAME, type Subject } from '../config/game';
import { ubDay } from '../domain/time';
import type { Bindings } from '../env';
import { newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { pickSql } from './pool';
import { loadTask } from './tasks';
import { getUserRow, requireLife } from './users';

/** SQL: өнөөдөр дуусгасан өнөөдрийн хичээлийн тоо. Утгууд: userId, subject, today. */
const DONE_TODAY = `SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'completed' AND kind = 'review'`;

export async function startReview(env: Bindings, userId: number, subject: Subject, now = Date.now()): Promise<TaskDto> {
  const db = env.DB;
  const user = await getUserRow(db, userId);
  if (!subjectInGrade(subject, user.grade)) throw new ApiError(400, 'SUBJECT_NOT_IN_GRADE', SUBJECT_NOT_IN_GRADE_MESSAGE);
  requireLife(user, now);
  const today = ubDay(now);

  const existing = await db
    .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review'`)
    .bind(userId, subject, today)
    .first<{ id: number }>();
  if (existing) return loadTask(db, userId, existing.id);
  // Амь зарцуулдаггүй тул хязгааргүй давтвал оноо, XP цуглуулах арга болно: хичээл бүрт өдөрт REVIEW_PER_DAY.
  const done = await db.prepare(DONE_TODAY).bind(userId, subject, today).first<{ n: number }>();
  if ((done?.n ?? 0) >= GAME.REVIEW_PER_DAY) throw new ApiError(409, 'REVIEW_DONE', 'Өнөөдрийн хичээлээ хийчихлээ. Маргааш дахин ирээрэй');

  // Ангийн бүх асуултаас (хичээл, хуудас харгалзахгүй): хараагүйг түрүүлж, дутвал хамгийн эрт харсныг.
  const ids = (
    await db
      .prepare(pickSql(false))
      .bind(user.tier, subject, userId, user.tier, subject, userId, GAME.REVIEW_QUESTIONS)
      .all<{ id: number }>()
  ).results.map((row) => row.id);
  if (ids.length < GAME.REVIEW_QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй байна');

  const tx = newTx();
  const taskId = '(SELECT id FROM tasks WHERE tx = ?)';
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (user_id, subject, day, status, kind, lesson_ref, tx, created_at)
         SELECT ?, ?, ?, 'in_progress', 'review', NULL, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review')
           AND (${DONE_TODAY}) < ?`,
      )
      .bind(userId, subject, today, tx, now, userId, subject, today, userId, subject, today, GAME.REVIEW_PER_DAY),
    ...ids.map((id, i) =>
      db.prepare(`INSERT INTO task_questions (task_id, position, question_id) SELECT ${taskId}, ?, ? WHERE ${taskId} IS NOT NULL`).bind(tx, i, id, tx),
    ),
  ]);
  const created = await db
    .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review'`)
    .bind(userId, subject, today)
    .first<{ id: number }>();
  if (!created) throw new ApiError(500, 'INTERNAL', 'Даалгавар үүсгэж чадсангүй');
  return loadTask(db, userId, created.id);
}
