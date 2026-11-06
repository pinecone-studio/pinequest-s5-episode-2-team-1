import type { AssignmentDto } from '../../../shared/assignment';
import type { Subject } from '../../../shared/types';
import { TEACHER } from '../config/teacher';
import { topicLabel } from '../domain/classStats';
import { percentOf } from '../domain/quiz';
import { addDays, ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import { pickClassQuestions } from './quiz';
import { teacherClass, teacherSubject } from './teacher';

// Багшийн даалгавар (багшийн тал): өгөх, ангийн гүйцэтгэл. Сурагчийн тал нь assignmentPlay.ts.

const { QUESTIONS, MIN_QUESTIONS } = TEACHER.ASSIGNMENT;

/** Ангид даалгавар өгнө: багшийн хичээлээр (topic өгвөл тэр сэдвээр), өнөөдрөөс `days` хоногийн дотор хийнэ. */
export async function createAssignment(db: D1Database, teacher: number, code: string, topic: string | null, days: number, now = Date.now()) {
  const cls = await teacherClass(db, teacher, code, now);
  const subject = await teacherSubject(db, teacher);
  if (!subject) throw new ApiError(409, 'BAD_REQUEST', 'Эхлээд заадаг хичээлээ сонгоно уу');
  const ids = await pickClassQuestions(db, cls.id, subject, topic, QUESTIONS);
  if (ids.length < MIN_QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Энэ сэдвээр асуулт хүрэлцэхгүй байна');
  const res = await db
    .prepare('INSERT INTO assignments (clan_id, teacher_id, subject, topic, question_ids, due_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(cls.id, teacher, subject, topic, JSON.stringify(ids), addDays(ubDay(now), days), now)
    .run();
  return { id: Number(res.meta.last_row_id) };
}

interface AssignmentRow {
  id: number;
  subject: Subject;
  topic: string | null;
  question_ids: string;
  due_day: string;
}

interface Progress {
  aid: number;
  uid: number;
  n: number;
  ok: number;
}

const RECENT = 'SELECT id FROM assignments WHERE clan_id = ? ORDER BY id DESC LIMIT ?';

/** Ангийн сүүлийн даалгаврууд: хэдэн сурагч дуусгасан, зөв хувь, хэн хийгээгүй. `people` = одоогийн сурагчид. */
export async function classAssignments(
  db: D1Database,
  clanId: number,
  people: { id: number; name: string }[],
  today = ubDay(Date.now()),
): Promise<AssignmentDto[]> {
  const [list, answers] = await db.batch([
    db.prepare(`SELECT id, subject, topic, question_ids, due_day FROM assignments WHERE id IN (${RECENT}) ORDER BY id DESC`).bind(clanId, TEACHER.RECENT_ASSIGNMENTS),
    db
      .prepare(
        `SELECT assignment_id AS aid, user_id AS uid, COUNT(*) AS n, SUM(correct) AS ok FROM assignment_answers
         WHERE assignment_id IN (${RECENT}) GROUP BY assignment_id, user_id`,
      )
      .bind(clanId, TEACHER.RECENT_ASSIGNMENTS),
  ]);
  const got = answers.results as Progress[];
  return (list.results as AssignmentRow[]).map((a) => {
    const total = (JSON.parse(a.question_ids) as number[]).length;
    // гарсан сурагчийн хариулт тоонд орохгүй
    const rows = people.map((p) => ({ name: p.name, r: got.find((g) => g.aid === a.id && g.uid === p.id) }));
    const finished = (r?: Progress) => (r?.n ?? 0) >= total;
    return {
      id: a.id,
      subject: a.subject,
      topicName: topicLabel(a.subject, a.topic),
      total,
      dueDay: a.due_day,
      open: today <= a.due_day,
      done: rows.filter((x) => finished(x.r)).length,
      students: people.length,
      percent: percentOf(
        rows.reduce((n, x) => n + (x.r?.ok ?? 0), 0),
        rows.reduce((n, x) => n + (x.r?.n ?? 0), 0),
      ),
      missing: rows.filter((x) => !finished(x.r)).map((x) => x.name),
    };
  });
}
