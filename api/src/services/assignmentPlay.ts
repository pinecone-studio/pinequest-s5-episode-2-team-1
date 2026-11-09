import type { AssignmentsResponse, AssignmentView } from '../../../shared/assignment';
import type { Subject } from '../../../shared/types';
import { TEACHER } from '../config/teacher';
import { topicLabel } from '../domain/classStats';
import { ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import { clanOf } from './clans';

// Багшийн даалгавар (сурагчийн тал): ангийн нээлттэй даалгаврууд, нэгийг дарааллаар нь хийх.

interface Row {
  id: number;
  clan_id: number;
  subject: Subject;
  topic: string | null;
  question_ids: string;
  due_day: string;
}

interface QuestionRow {
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string | null;
  image: string | null;
}

/** Миний ангийн хугацаа дуусаагүй даалгаврууд (ойрхон дуусах нь эхэндээ) ба миний явц. */
export async function myAssignments(db: D1Database, me: number, now = Date.now()): Promise<AssignmentsResponse> {
  const clan = await clanOf(db, me);
  if (!clan) return { assignments: [] };
  const { results } = await db
    .prepare(
      `SELECT s.id, s.subject, s.topic, s.question_ids, s.due_day,
         (SELECT COUNT(*) FROM assignment_answers aa WHERE aa.assignment_id = s.id AND aa.user_id = ?1) AS answered,
         (SELECT COALESCE(SUM(correct), 0) FROM assignment_answers aa WHERE aa.assignment_id = s.id AND aa.user_id = ?1) AS correct
       FROM assignments s WHERE s.clan_id = ?2 AND s.due_day >= ?3 ORDER BY s.due_day, s.id LIMIT ?4`,
    )
    .bind(me, clan.id, ubDay(now), TEACHER.RECENT_ASSIGNMENTS)
    .all<Omit<Row, 'clan_id'> & { answered: number; correct: number }>();
  return {
    assignments: results.map((r) => ({
      id: r.id,
      subject: r.subject,
      topicName: topicLabel(r.subject, r.topic),
      total: (JSON.parse(r.question_ids) as number[]).length,
      dueDay: r.due_day,
      answered: r.answered,
      correct: r.correct,
    })),
  };
}

/** Даалгавар, асуултууд (зөв хариутай), миний хариултууд. Өөр ангийнх бол 403. */
async function load(db: D1Database, me: number, id: number) {
  const a = await db.prepare('SELECT id, clan_id, subject, topic, question_ids, due_day FROM assignments WHERE id = ?').bind(id).first<Row>();
  if (!a) throw new ApiError(404, 'NOT_FOUND', 'Даалгавар олдсонгүй');
  if ((await clanOf(db, me))?.id !== a.clan_id) throw new ApiError(403, 'FORBIDDEN', 'Энэ даалгавар чиний ангийнх биш');
  const [qs, mine] = await db.batch([
    db
      .prepare('SELECT q.prompt, q.options, q.correct_index, q.explanation, q.image FROM json_each(?) j JOIN questions q ON q.id = j.value ORDER BY j.key')
      .bind(a.question_ids),
    db.prepare('SELECT position, choice, correct FROM assignment_answers WHERE assignment_id = ? AND user_id = ? ORDER BY position').bind(id, me),
  ]);
  return { a, questions: qs.results as QuestionRow[], answers: mine.results as { position: number; choice: number; correct: number }[] };
}

/** Зөв хариу, тайлбар зөвхөн хариулсан асуултад л явна. */
export async function assignmentView(db: D1Database, me: number, id: number, now = Date.now()): Promise<AssignmentView> {
  const { a, questions, answers } = await load(db, me, id);
  return {
    id: a.id,
    subject: a.subject,
    topicName: topicLabel(a.subject, a.topic),
    dueDay: a.due_day,
    open: ubDay(now) <= a.due_day,
    questions: questions.map((q) => ({ prompt: q.prompt, options: JSON.parse(q.options) as string[], ...(q.image ? { image: q.image } : {}) })),
    answers: answers.map((r) => ({
      choice: r.choice,
      correct: r.correct === 1,
      correctIndex: questions[r.position].correct_index,
      explanation: questions[r.position].explanation,
    })),
  };
}

/** Дараагийн асуултад хариулна (дарааллаар, эхний хариулт л тоологдоно). Хугацаа дууссан бол 409. */
export async function answerAssignment(db: D1Database, me: number, id: number, position: number, choice: number, now = Date.now()) {
  const { a, questions, answers } = await load(db, me, id);
  if (ubDay(now) > a.due_day) throw new ApiError(409, 'TASK_CLOSED', 'Даалгаврын хугацаа дууссан');
  if (position !== answers.length || position >= questions.length) throw new ApiError(409, 'TASK_CLOSED', 'Энэ асуултад хариулсан байна');
  await db
    .prepare('INSERT OR IGNORE INTO assignment_answers (assignment_id, user_id, position, choice, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, me, position, choice, choice === questions[position].correct_index ? 1 : 0, now)
    .run();
  return assignmentView(db, me, id, now);
}
