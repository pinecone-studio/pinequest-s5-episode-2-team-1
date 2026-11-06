import type { StudentStatDto, TeacherClassDetailResponse } from '../../../shared/teacher';
import { classWeakTopics, studentAnswers, type TopicAnswers } from '../domain/classStats';
import { parseBearLook } from '../domain/profile';
import { normalizeStreak } from '../domain/streak';
import { ubDay } from '../domain/time';
import { classAssignments } from './assignments';
import { profileOwner } from './profileCodes';
import { teacherClass, teacherSubject, toDto } from './teacher';
import { streakStateOf, type UserRow } from './users';

// Ангийн тайлан: сурагчид (дараалал, зөв хувь, сул сэдэв), ангийн сул сэдэв, багшийн даалгаврууд.

type StudentRow = Pick<UserRow, 'id' | 'username' | 'display_name' | 'grade' | 'bear_look' | 'streak' | 'last_streak_day' | 'shield_held' | 'shield_bought_day' | 'shield_used_day'> & {
  profile_code: string | null;
};

/**
 * Сурагч бүрийн сэдэв тус бүрийн хариулт: өдрийн даалгавар + ангийн тэмцээн + багшийн даалгавар (?1 = анги).
 * Багшийн хичээл (?2) өгвөл зөвхөн тэр хичээлээр.
 */
const ANSWERS_SQL = `SELECT a.uid, q.subject, q.topic, COUNT(*) AS n, SUM(a.ok) AS ok FROM (
    SELECT t.user_id AS uid, tq.question_id AS qid, tq.correct AS ok
      FROM clan_members m JOIN tasks t ON t.user_id = m.user_id JOIN task_questions tq ON tq.task_id = t.id
      WHERE m.clan_id = ?1 AND tq.choice >= 0 AND tq.correct IS NOT NULL
    UNION ALL
    SELECT qa.user_id, json_extract(g.question_ids, '$[' || qa.q || ']'), qa.correct
      FROM quiz_games g JOIN quiz_answers qa ON qa.game_id = g.id
      JOIN clan_members m ON m.user_id = qa.user_id AND m.clan_id = g.clan_id
      WHERE g.clan_id = ?1
    UNION ALL
    SELECT aa.user_id, json_extract(s.question_ids, '$[' || aa.position || ']'), aa.correct
      FROM assignments s JOIN assignment_answers aa ON aa.assignment_id = s.id
      JOIN clan_members m ON m.user_id = aa.user_id AND m.clan_id = s.clan_id
      WHERE s.clan_id = ?1
  ) a JOIN questions q ON q.id = a.qid
  WHERE ?2 IS NULL OR q.subject = ?2
  GROUP BY a.uid, q.subject, q.topic`;

export async function classDetail(db: D1Database, teacher: number, code: string, now = Date.now()): Promise<TeacherClassDetailResponse> {
  const cls = await teacherClass(db, teacher, code, now);
  const subject = await teacherSubject(db, teacher);
  const [students, answers] = await db.batch([
    db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.grade, u.bear_look, u.profile_code,
           u.streak, u.last_streak_day, u.shield_held, u.shield_bought_day, u.shield_used_day
         FROM clan_members m JOIN users u ON u.id = m.user_id WHERE m.clan_id = ? ORDER BY m.joined_at`,
      )
      .bind(cls.id),
    db.prepare(ANSWERS_SQL).bind(cls.id, subject),
  ]);
  const rows = answers.results as TopicAnswers[];
  const today = ubDay(now);
  const members = (students.results as StudentRow[]).filter((s) => s.profile_code);

  const list: StudentStatDto[] = members
    .map((s) => ({
      code: s.profile_code!,
      name: s.display_name ?? s.username,
      grade: s.grade,
      look: parseBearLook(s.bear_look),
      ...studentAnswers(rows, s.id),
      // тасарсан дарааллыг DB-д бичилгүй 0 гэж харуулна (сурагч өөрөө орохоор засагдана)
      streak: normalizeStreak(streakStateOf(s), today).state.streak,
    }))
    // их алддаг нь эхэндээ, хараахан хариулаагүй нь сүүлдээ
    .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101));

  const people = members.map((s) => ({ id: s.id, name: s.display_name ?? s.username }));
  return {
    class: toDto(cls),
    subject,
    students: list,
    weakTopics: classWeakTopics(rows),
    assignments: await classAssignments(db, cls.id, people, today),
  };
}

/** Сурагчийг ангиас хасна (профайлын кодоор). */
export async function removeStudent(db: D1Database, teacher: number, code: string, profileCode: string, now = Date.now()) {
  const cls = await teacherClass(db, teacher, code, now);
  const student = await profileOwner(db, profileCode);
  await db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').bind(cls.id, student).run();
  return classDetail(db, teacher, code, now);
}
