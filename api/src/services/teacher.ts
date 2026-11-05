import { normalizeClanName } from '../../../shared/clan';
import type { StudentStatDto, TeacherClassDetailResponse, TeacherClassDto, TeacherClassesResponse, TopicStatDto } from '../../../shared/teacher';
import type { Subject } from '../../../shared/types';
import { GAME, type Tier } from '../config/game';
import { TEACHER } from '../config/teacher';
import { TOPICS } from '../config/topics';
import { newClanCode, newClanPublicId, normalizeClanCode } from '../domain/clanCode';
import { parseBearLook } from '../domain/profile';
import { percentOf } from '../domain/quiz';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { profileOwner } from './profileCodes';

// Багшийн анги = clans мөр (owner_id = багш). Багш өөрөө clan_members-д ордоггүй тул олон ангитай, эрэмбэд харагдахгүй.
// Сурагчид одоогийн "Кодоор нэгдэх" урсгалаар (/clans/:code/join) нэгдэнэ.

export interface TeacherClassRow {
  id: number;
  name: string;
  code: string;
  students: number;
  live: number | null;
}

const CLASS_SQL = `SELECT c.id, c.name, c.code,
    (SELECT COUNT(*) FROM clan_members m WHERE m.clan_id = c.id) AS students,
    (SELECT g.id FROM quiz_games g WHERE g.clan_id = c.id AND g.phase != 'finished' AND g.created_at > ? ORDER BY g.id DESC LIMIT 1) AS live
  FROM clans c WHERE c.owner_id = ?`;

const toDto = (r: TeacherClassRow): TeacherClassDto => ({
  code: r.code,
  name: r.name,
  students: r.students,
  maxStudents: GAME.CLAN.MAX_MEMBERS,
  liveQuizId: r.live,
});

export async function listClasses(db: D1Database, teacher: number, now = Date.now()): Promise<TeacherClassesResponse> {
  const { results } = await db.prepare(`${CLASS_SQL} ORDER BY c.created_at DESC`).bind(now - TEACHER.QUIZ.STALE_MS, teacher).all<TeacherClassRow>();
  return { classes: results.map(toDto) };
}

/** Багшийн өөрийн анги; өөр хүнийх эсвэл байхгүй бол 404 (бусдын ангийг байгаа эсэхийг ч хэлэхгүй). */
export async function teacherClass(db: D1Database, teacher: number, input: string, now = Date.now()): Promise<TeacherClassRow> {
  const code = normalizeClanCode(input);
  const row = code
    ? await db.prepare(`${CLASS_SQL} AND c.code = ?`).bind(now - TEACHER.QUIZ.STALE_MS, teacher, code).first<TeacherClassRow>()
    : null;
  if (!row) throw new ApiError(404, 'CLAN_NOT_FOUND', 'Ийм анги олдсонгүй');
  return row;
}

export async function createClass(db: D1Database, teacher: number, input: string, now = Date.now()): Promise<TeacherClassesResponse> {
  const name = normalizeClanName(input);
  if (!name) throw new ApiError(400, 'BAD_REQUEST', 'Ангийн нэрийг бичнэ үү (жишээ нь 7А)');
  const count = await db.prepare('SELECT COUNT(*) AS n FROM clans WHERE owner_id = ?').bind(teacher).first<{ n: number }>();
  if ((count?.n ?? 0) >= TEACHER.MAX_CLASSES) throw new ApiError(400, 'BAD_REQUEST', `Хамгийн ихдээ ${TEACHER.MAX_CLASSES} анги нээнэ`);
  for (let attempt = 0; ; attempt++) {
    try {
      await db
        .prepare('INSERT INTO clans (name, code, public_id, owner_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(name, newClanCode(), newClanPublicId(), teacher, now)
        .run();
      break;
    } catch (e) {
      if (attempt >= 4 || !isConstraintError(e, 'UNIQUE')) throw e;
    }
  }
  return listClasses(db, teacher, now);
}

interface StudentRow {
  id: number;
  username: string;
  display_name: string | null;
  grade: number;
  bear_look: string | null;
  profile_code: string | null;
}

interface AnswerRow {
  uid: number;
  tier: Tier;
  subject: Subject;
  topic: string | null;
  n: number;
  ok: number;
}

const topicName = (r: AnswerRow) => TOPICS[r.tier]?.[r.subject]?.find((t) => t.id === r.topic)?.name ?? r.topic ?? '';

/** Анги: сурагчид (их алддаг нь эхэндээ) ба ангийн хамгийн их алддаг сэдвүүд — өдрийн даалгаврын хариултаас. */
export async function classDetail(db: D1Database, teacher: number, code: string, now = Date.now()): Promise<TeacherClassDetailResponse> {
  const cls = await teacherClass(db, teacher, code, now);
  const [students, answers] = await db.batch([
    db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.grade, u.bear_look, u.profile_code
         FROM clan_members m JOIN users u ON u.id = m.user_id WHERE m.clan_id = ? ORDER BY m.joined_at`,
      )
      .bind(cls.id),
    db
      .prepare(
        `SELECT t.user_id AS uid, q.tier, q.subject, q.topic, COUNT(*) AS n, SUM(tq.correct) AS ok
         FROM clan_members m JOIN tasks t ON t.user_id = m.user_id
         JOIN task_questions tq ON tq.task_id = t.id JOIN questions q ON q.id = tq.question_id
         WHERE m.clan_id = ? AND tq.choice >= 0 AND tq.correct IS NOT NULL
         GROUP BY t.user_id, q.tier, q.subject, q.topic`,
      )
      .bind(cls.id),
  ]);
  const rows = answers.results as AnswerRow[];

  const byTopic = new Map<string, TopicStatDto>();
  for (const r of rows.filter((r) => r.topic)) {
    const key = `${r.subject}:${r.topic}`;
    const t = byTopic.get(key) ?? { subject: r.subject, topic: r.topic!, name: topicName(r), answered: 0, correct: 0, percent: 0 };
    t.answered += r.n;
    t.correct += r.ok;
    byTopic.set(key, t);
  }
  const weakTopics = [...byTopic.values()]
    .filter((t) => t.answered >= TEACHER.MIN_TOPIC_ANSWERS)
    .map((t) => ({ ...t, percent: percentOf(t.correct, t.answered) ?? 0 }))
    .sort((a, b) => a.percent - b.percent || b.answered - a.answered)
    .slice(0, TEACHER.WEAK_TOPICS);

  const list: StudentStatDto[] = (students.results as StudentRow[])
    .filter((s) => s.profile_code)
    .map((s) => {
      const mine = rows.filter((r) => r.uid === s.id);
      const answered = mine.reduce((n, r) => n + r.n, 0);
      const weak = mine
        .filter((r) => r.topic && r.n >= TEACHER.MIN_TOPIC_ANSWERS && r.ok < r.n)
        .sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
      return {
        code: s.profile_code!,
        name: s.display_name ?? s.username,
        grade: s.grade,
        look: parseBearLook(s.bear_look),
        answered,
        percent: percentOf(mine.reduce((n, r) => n + r.ok, 0), answered),
        weakTopic: weak ? topicName(weak) : null,
      };
    })
    // их алддаг нь эхэндээ, хараахан хариулаагүй нь сүүлдээ
    .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101));

  return { class: toDto(cls), students: list, weakTopics };
}

/** Сурагчийг ангиас хасна (профайлын кодоор). */
export async function removeStudent(db: D1Database, teacher: number, code: string, profileCode: string, now = Date.now()) {
  const cls = await teacherClass(db, teacher, code, now);
  const student = await profileOwner(db, profileCode);
  await db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').bind(cls.id, student).run();
  return classDetail(db, teacher, code, now);
}
