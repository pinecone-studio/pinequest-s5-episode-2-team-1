import { normalizeClanName } from '../../../shared/clan';
import type { TeacherClassDto, TeacherClassesResponse } from '../../../shared/teacher';
import type { Subject } from '../../../shared/types';
import { ACTIVE_SUBJECTS, GAME } from '../config/game';
import { TEACHER } from '../config/teacher';
import { newClanCode, newClanPublicId, normalizeClanCode } from '../domain/clanCode';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';

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

export const toDto = (r: TeacherClassRow): TeacherClassDto => ({
  code: r.code,
  name: r.name,
  students: r.students,
  maxStudents: GAME.CLAN.MAX_MEMBERS,
  liveQuizId: r.live,
});

/** Багшийн заадаг хичээл (сонгоогүй бол null). */
export async function teacherSubject(db: D1Database, teacher: number): Promise<Subject | null> {
  const row = await db.prepare('SELECT teacher_subject FROM users WHERE id = ?').bind(teacher).first<{ teacher_subject: string | null }>();
  return (ACTIVE_SUBJECTS as readonly string[]).includes(row?.teacher_subject ?? '') ? (row!.teacher_subject as Subject) : null;
}

/** Хичээлээ сонгоно (бүртгүүлсний дараах эхний алхам; дараа нь сольж болно). */
export async function setTeacherSubject(db: D1Database, teacher: number, subject: Subject): Promise<TeacherClassesResponse> {
  await db.prepare('UPDATE users SET teacher_subject = ? WHERE id = ?').bind(subject, teacher).run();
  return listClasses(db, teacher);
}

export async function listClasses(db: D1Database, teacher: number, now = Date.now()): Promise<TeacherClassesResponse> {
  const { results } = await db.prepare(`${CLASS_SQL} ORDER BY c.created_at DESC`).bind(now - TEACHER.QUIZ.STALE_MS, teacher).all<TeacherClassRow>();
  return { subject: await teacherSubject(db, teacher), classes: results.map(toDto) };
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
