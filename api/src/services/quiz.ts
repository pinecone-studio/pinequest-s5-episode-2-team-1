import type { QuizActiveResponse, QuizView } from '../../../shared/teacher';
import type { Subject } from '../../../shared/types';
import { GAME } from '../config/game';
import { TEACHER } from '../config/teacher';
import { tierForGrade } from '../domain/level';
import { nextStep, quizPoints } from '../domain/quiz';
import { ApiError } from '../lib/errors';
import { clanOf } from './clans';
import { modeGrade } from './league';
import { loadGame, quizView } from './quizView';
import { teacherClass } from './teacher';

// Ангийн шууд тэмцээн (Kahoot маягийн). Төлөв D1-д; багш, сурагчид 1 секунд тутам GET /quiz/:id асууна.
// shortcut: polling (WebSocket биш) — нэг ангид ≤40 хүн тул хангалттай; олон анги зэрэг тоглох бол DuelRoom шиг DO руу шилжинэ.

const { QUESTIONS, MIN_QUESTIONS, STALE_MS } = TEACHER.QUIZ;


/** Тэмцээн эхлүүлнэ (хүлээлгийн өрөө). Ангийн өмнөх дуусаагүй тэмцээнийг хаана. topic өгвөл зөвхөн тэр сэдвээр. */
export async function startQuiz(db: D1Database, teacher: number, code: string, subject: Subject, topic: string | null, now = Date.now()) {
  const cls = await teacherClass(db, teacher, code, now);
  const { results: grades } = await db
    .prepare('SELECT u.grade, COUNT(*) AS n FROM clan_members m JOIN users u ON u.id = m.user_id WHERE m.clan_id = ? GROUP BY u.grade')
    .bind(cls.id)
    .all<{ grade: number; n: number }>();
  const grade = modeGrade(grades) ?? GAME.GRADE_MIN;
  const tier = tierForGrade(grade);
  if (!tier) throw new ApiError(500, 'INTERNAL');
  const { results: picked } = await db
    .prepare(
      `SELECT id FROM questions WHERE tier = ? AND subject = ? AND flagged = 0 AND (book_ref IS NULL OR grade = ?) AND (?5 IS NULL OR topic = ?5)
       ORDER BY RANDOM() LIMIT ?4`,
    )
    .bind(tier, subject, grade, QUESTIONS, topic)
    .all<{ id: number }>();
  if (picked.length < MIN_QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Энэ сэдвээр асуулт хүрэлцэхгүй байна');
  const [, inserted] = await db.batch([
    db.prepare("UPDATE quiz_games SET phase = 'finished', phase_at = ? WHERE clan_id = ? AND phase != 'finished'").bind(now, cls.id),
    db
      .prepare('INSERT INTO quiz_games (clan_id, host_id, subject, question_ids, phase_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(cls.id, teacher, subject, JSON.stringify(picked.map((p) => p.id)), now, now),
  ]);
  return { quizId: Number(inserted.meta.last_row_id) };
}

/** Миний ангид явж буй тэмцээн (сурагчид "Тэмцээнд нэгдэх" товч харуулахад). */
export async function activeQuiz(db: D1Database, me: number, now = Date.now()): Promise<QuizActiveResponse> {
  const clan = await clanOf(db, me);
  if (!clan) return { quizId: null };
  const row = await db
    .prepare("SELECT id FROM quiz_games WHERE clan_id = ? AND phase != 'finished' AND created_at > ? ORDER BY id DESC LIMIT 1")
    .bind(clan.id, now - STALE_MS)
    .first<{ id: number }>();
  return { quizId: row?.id ?? null };
}

export async function joinQuiz(db: D1Database, me: number, id: number, now = Date.now()): Promise<QuizView> {
  const g = await loadGame(db, id);
  if ((await clanOf(db, me))?.id !== g.clan_id) throw new ApiError(403, 'FORBIDDEN', 'Энэ тэмцээн чиний ангийнх биш');
  if (g.phase === 'finished') throw new ApiError(409, 'BAD_REQUEST', 'Тэмцээн дууссан байна');
  await db.prepare('INSERT OR IGNORE INTO quiz_players (game_id, user_id, joined_at) VALUES (?, ?, ?)').bind(id, me, now).run();
  return quizView(db, me, id, now);
}

/** Эхний хариулт л тоологдоно; хугацаа дууссан, өөр асуулт, тоглогч биш бол 409. */
export async function answerQuiz(db: D1Database, me: number, id: number, q: number, choice: number, now = Date.now()): Promise<QuizView> {
  const g = await loadGame(db, id);
  const view = await quizView(db, me, id, now);
  if (view.phase !== 'question' || view.q !== q) throw new ApiError(409, 'TASK_CLOSED', 'Энэ асуултын хугацаа дууссан');
  const questionId = (JSON.parse(g.question_ids) as number[])[q];
  const row = await db.prepare('SELECT correct_index FROM questions WHERE id = ?').bind(questionId).first<{ correct_index: number }>();
  if (!row) throw new ApiError(500, 'INTERNAL');
  const correct = choice === row.correct_index;
  await db
    .prepare(
      `INSERT OR IGNORE INTO quiz_answers (game_id, user_id, q, choice, correct, points, answered_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE EXISTS (SELECT 1 FROM quiz_players WHERE game_id = ?1 AND user_id = ?2)`,
    )
    .bind(id, me, q, choice, correct ? 1 : 0, correct ? quizPoints(now - g.phase_at) : 0, now)
    .run();
  return quizView(db, me, id, now);
}

/** Багш "Дараах": хүлээлгээс 1-р асуулт, асуултаас хариу, хариунаас дараагийн асуулт эсвэл төгсгөл. */
export async function advanceQuiz(db: D1Database, me: number, id: number, now = Date.now()): Promise<QuizView> {
  const g = await loadGame(db, id);
  const view = await quizView(db, me, id, now);
  if (!view.isHost) throw new ApiError(403, 'FORBIDDEN', 'Тэмцээнийг зөвхөн багш удирдана');
  const next = nextStep(view.phase, view.q, view.total);
  // хоёр удаа дарсан (эсвэл хоёр төхөөрөмж) үед нэг л алхам ахина
  await db
    .prepare('UPDATE quiz_games SET phase = ?, q = ?, phase_at = ? WHERE id = ? AND q = ? AND phase = ?')
    .bind(next.phase, next.q, now, id, g.q, g.phase)
    .run();
  return quizView(db, me, id, now);
}
