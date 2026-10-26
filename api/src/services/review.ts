// Өнөөдрийн хичээл: хүүхдийн өмнө хийсэн сурах замын хичээлүүдээс санамсаргүй нэгийг REVIEW_QUESTIONS бодлогоор
// давтана (нүүрний зөгийн балны товч). Замд нөлөөлөхгүй, давтлага үүсгэхгүй, амь зарцуулахгүй (амьгүй бол хаалттай);
// оноо, XP, дараалал ердийн даалгавар шиг.
import type { TaskDto } from '../../../shared/types';
import { GAME, type Subject } from '../config/game';
import { ubDay } from '../domain/time';
import type { Bindings } from '../env';
import { newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { generate, templatesFor } from '../templates';
import { bookLessons } from './lessons';
import { IN_RANGE, OWN_GRADE, parseLessonRef, rangeArgs, storeGenerated } from './pool';
import { loadTask } from './tasks';
import { getUserRow, requireLife } from './users';

/** Хичээлийн нэр (номын гарчгаас): хуудасны эхлэлээр. */
async function lessonTitle(env: Bindings, subject: Subject, grade: number, ref: string): Promise<string | null> {
  const range = parseLessonRef(ref);
  const book = range && (await bookLessons(env, subject, grade).catch(() => null));
  return book?.lessons.find((l) => l.page !== null && l.page + book.offset === range?.from)?.title ?? null;
}

export async function startReview(env: Bindings, userId: number, subject: Subject, now = Date.now()): Promise<TaskDto> {
  const db = env.DB;
  const user = await getUserRow(db, userId);
  requireLife(user, now);
  const today = ubDay(now);

  const existing = await db
    .prepare(`SELECT id, lesson_ref FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review'`)
    .bind(userId, subject, today)
    .first<{ id: number; lesson_ref: string }>();
  if (existing) return { ...(await loadTask(db, userId, existing.id)), title: await lessonTitle(env, subject, user.grade, existing.lesson_ref) };

  // Өмнө дуусгасан сурах замын хичээлүүдээс санамсаргүй нэг
  const pick = await db
    .prepare(
      `SELECT lesson_ref FROM tasks WHERE user_id = ? AND subject = ? AND status = 'completed' AND kind = 'path' AND lesson_ref IS NOT NULL
       GROUP BY lesson_ref ORDER BY RANDOM() LIMIT 1`,
    )
    .bind(userId, subject)
    .first<{ lesson_ref: string }>();
  const range = parseLessonRef(pick?.lesson_ref ?? null);
  if (!pick || !range) throw new ApiError(409, 'NO_REVIEW', 'Эхлээд сурах замаар хичээл хийгээрэй');

  // Загвартай хичээлд шинэ тоотой бодлого; үгүй бол тэр хичээлийн хуудасны асуулт эсвэл хүүхдийн тэр хичээл дээр
  // өмнө бодсон асуултуудаас санамсаргүй.
  const templates = templatesFor(range);
  const made = templates.length
    ? await storeGenerated(db, user.tier, subject, user.grade, generate(templates, GAME.REVIEW_QUESTIONS), now)
    : [];
  const ids = made.length
    ? made
    : (
        await db
          .prepare(
            `SELECT q.id FROM questions q
             WHERE q.flagged = 0 AND (
               (q.subject = ? AND ${OWN_GRADE} AND ${IN_RANGE})
               OR q.id IN (SELECT tq.question_id FROM task_questions tq JOIN tasks t ON t.id = tq.task_id
                           WHERE t.user_id = ? AND t.kind = 'path' AND t.lesson_ref = ?))
             ORDER BY RANDOM() LIMIT ?`,
          )
          .bind(subject, userId, ...rangeArgs(range), userId, pick.lesson_ref, GAME.REVIEW_QUESTIONS)
          .all<{ id: number }>()
      ).results.map((r) => r.id);
  if (ids.length < GAME.REVIEW_QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй байна');

  const tx = newTx();
  const taskId = '(SELECT id FROM tasks WHERE tx = ?)';
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (user_id, subject, day, status, kind, lesson_ref, tx, created_at)
         SELECT ?, ?, ?, 'in_progress', 'review', ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review')`,
      )
      .bind(userId, subject, today, pick.lesson_ref, tx, now, userId, subject, today),
    ...ids.map((id, i) =>
      db.prepare(`INSERT INTO task_questions (task_id, position, question_id) SELECT ${taskId}, ?, ? WHERE ${taskId} IS NOT NULL`).bind(tx, i, id, tx),
    ),
  ]);
  const created = await db
    .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review'`)
    .bind(userId, subject, today)
    .first<{ id: number }>();
  if (!created) throw new ApiError(500, 'INTERNAL', 'Даалгавар үүсгэж чадсангүй');
  return { ...(await loadTask(db, userId, created.id)), title: await lessonTitle(env, subject, user.grade, pick.lesson_ref) };
}
