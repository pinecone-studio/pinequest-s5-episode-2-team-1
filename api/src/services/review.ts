// Өнөөдрийн хичээл: хүүхдийн өмнө хийсэн сурах замын хичээлүүдээс санамсаргүй нэгийг REVIEW_QUESTIONS бодлогоор
// давтана (нүүрний өнөөдрийн хичээлийн товч). Замд нөлөөлөхгүй, давтлага үүсгэхгүй; буруу хариулбал амь хасагдана
// (амьгүй бол хаалттай);
// оноо, XP, дараалал ердийн даалгавар шиг.
import type { TaskDto } from '../../../shared/types';
import { GAME, type Subject } from '../config/game';
import { ubDay } from '../domain/time';
import type { Bindings } from '../env';
import { newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { generate, shouldGenerateTemplates, templatesFor } from '../templates';
import { bookLessons } from './lessons';
import { IN_RANGE, OWN_GRADE, parseLessonRef, rangeArgs, storeGenerated } from './pool';
import { loadTask } from './tasks';
import { getUserRow, requireLife } from './users';

/** SQL: өнөөдөр дуусгасан өнөөдрийн хичээлийн тоо. Утгууд: userId, subject, today. */
const DONE_TODAY = `SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'completed' AND kind = 'review'`;

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
  // Амь зарцуулдаггүй тул хязгааргүй давтвал оноо, XP цуглуулах арга болно: хичээл бүрт өдөрт REVIEW_PER_DAY.
  const done = await db.prepare(DONE_TODAY).bind(userId, subject, today).first<{ n: number }>();
  if ((done?.n ?? 0) >= GAME.REVIEW_PER_DAY) throw new ApiError(409, 'REVIEW_DONE', 'Өнөөдрийн хичээлээ хийчихлээ. Маргааш дахин ирээрэй');

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

  // Тусгай загвартай хичээлд шинэ тоотой бодлого. Ерөнхий загвар бол хадгалсан асуулт хүрэлцэхгүй үед л нөөцөд
  // ашиглана; бусад үед тэр хичээлийн хуудасны асуулт эсвэл хүүхдийн өмнө бодсон асуултаас санамсаргүй сонгоно.
  const templates = templatesFor(range);
  // Хоёр салангид хэсгийг UNION-оор: нэг OR-оор бичвэл индекс ашиглагдахгүй, questions хүснэгтийг бүтнээр уншдаг байв.
  const pickStored = async () =>
    (
      await db
        .prepare(
          `SELECT id FROM (
             SELECT q.id FROM questions q
             WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND ${OWN_GRADE} AND ${IN_RANGE}
             UNION
             SELECT q.id FROM tasks t JOIN task_questions tq ON tq.task_id = t.id JOIN questions q ON q.id = tq.question_id
             WHERE t.user_id = ? AND t.subject = ? AND t.kind = 'path' AND t.lesson_ref = ? AND q.flagged = 0)
           ORDER BY RANDOM() LIMIT ?`,
        )
        .bind(user.tier, subject, userId, ...rangeArgs(range), userId, subject, pick.lesson_ref, GAME.REVIEW_QUESTIONS)
        .all<{ id: number }>()
    ).results.map((row) => row.id);
  const stored = templates.length > 0 && templates.every((template) => template.preferStored) ? await pickStored() : [];
  const made = shouldGenerateTemplates(templates, stored.length, GAME.REVIEW_QUESTIONS)
    ? await storeGenerated(db, user.tier, subject, user.grade, generate(templates, GAME.REVIEW_QUESTIONS), now)
    : [];
  const ids = stored.length >= GAME.REVIEW_QUESTIONS ? stored : made.length ? made : await pickStored();
  if (ids.length < GAME.REVIEW_QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй байна');

  const tx = newTx();
  const taskId = '(SELECT id FROM tasks WHERE tx = ?)';
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (user_id, subject, day, status, kind, lesson_ref, tx, created_at)
         SELECT ?, ?, ?, 'in_progress', 'review', ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'review')
           AND (${DONE_TODAY}) < ?`,
      )
      .bind(userId, subject, today, pick.lesson_ref, tx, now, userId, subject, today, userId, subject, today, GAME.REVIEW_PER_DAY),
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
