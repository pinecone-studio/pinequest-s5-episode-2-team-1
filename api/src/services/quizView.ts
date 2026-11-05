import type { QuizPhase, QuizView } from '../../../shared/teacher';
import type { Subject } from '../../../shared/types';
import { TEACHER } from '../config/teacher';
import { parseBearLook } from '../domain/profile';
import { effectivePhase } from '../domain/quiz';
import { ApiError } from '../lib/errors';
import { clanOf } from './clans';

// Тэмцээний төлөвийг уншина (services/quiz.ts-ийн бичих үйлдлүүд үүнийг буцаана).

const { QUESTION_MS } = TEACHER.QUIZ;

interface GameRow {
  id: number;
  clan_id: number;
  host_id: number;
  subject: Subject;
  question_ids: string;
  q: number;
  phase: QuizPhase;
  phase_at: number;
  class_name: string;
  class_code: string;
}

export async function loadGame(db: D1Database, id: number): Promise<GameRow> {
  const g = await db
    .prepare('SELECT g.*, c.name AS class_name, c.code AS class_code FROM quiz_games g JOIN clans c ON c.id = g.clan_id WHERE g.id = ?')
    .bind(id)
    .first<GameRow>();
  if (!g) throw new ApiError(404, 'NOT_FOUND', 'Тэмцээн олдсонгүй');
  return g;
}

/** Багш эсвэл тэр ангийн сурагч л харна. */
async function assertAccess(db: D1Database, g: GameRow, me: number) {
  if (g.host_id !== me && (await clanOf(db, me))?.id !== g.clan_id) throw new ApiError(403, 'FORBIDDEN', 'Энэ тэмцээн чиний ангийнх биш');
}

// prev: өмнөх асуултуудын оноо, cur: одоогийнх (асуулт явж байхад нууна: хэн зөв хариулсан нь илрэхгүй)
type BoardRow = { id: number; username: string; display_name: string | null; bear_look: string | null; prev: number; cur: number };
type QuestionRow = { prompt: string; options: string; correct_index: number; explanation: string };
type MineRow = { choice: number; correct: number; points: number };

export async function quizView(db: D1Database, me: number, id: number, now = Date.now()): Promise<QuizView> {
  const g = await loadGame(db, id);
  await assertAccess(db, g, me);
  const ids = JSON.parse(g.question_ids) as number[];
  const [board, answered, mine, question] = await db.batch([
    db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.bear_look, COALESCE(SUM(CASE WHEN a.q < ?2 THEN a.points END), 0) AS prev,
                COALESCE(SUM(CASE WHEN a.q = ?2 THEN a.points END), 0) AS cur
         FROM quiz_players p JOIN users u ON u.id = p.user_id
         LEFT JOIN quiz_answers a ON a.game_id = p.game_id AND a.user_id = p.user_id
         WHERE p.game_id = ?1 GROUP BY u.id ORDER BY p.joined_at`,
      )
      .bind(id, g.q),
    db.prepare('SELECT COUNT(*) AS n FROM quiz_answers WHERE game_id = ? AND q = ?').bind(id, g.q),
    db.prepare('SELECT choice, correct, points FROM quiz_answers WHERE game_id = ? AND q = ? AND user_id = ?').bind(id, g.q, me),
    db.prepare('SELECT prompt, options, correct_index, explanation FROM questions WHERE id = ?').bind(ids[g.q] ?? 0),
  ]);
  const players = board.results as BoardRow[];
  const n = (answered.results[0] as { n: number }).n;
  const phase = effectivePhase(g.phase, g.phase_at, n, players.length, now);
  const qRow = g.q >= 0 ? (question.results[0] as QuestionRow | undefined) : undefined;
  const my = mine.results[0] as MineRow | undefined;
  const shown = phase === 'reveal' || phase === 'finished';
  // бүгд хариулж хариу гарсныг хадгална: дараа нь хэн нэгэн нэгдсэн ч асуулт дахин нээгдэхгүй
  if (phase !== g.phase) await db.prepare("UPDATE quiz_games SET phase = 'reveal' WHERE id = ? AND phase = 'question' AND q = ?").bind(id, g.q).run();
  return {
    id,
    className: g.class_name,
    classCode: g.class_code,
    subject: g.subject,
    phase,
    q: g.q,
    total: ids.length,
    question: qRow && phase !== 'finished' ? { prompt: qRow.prompt, options: JSON.parse(qRow.options) as string[] } : null,
    endsAt: phase === 'question' ? g.phase_at + QUESTION_MS : null,
    questionMs: QUESTION_MS,
    correctIndex: shown && qRow ? qRow.correct_index : null,
    explanation: shown && qRow ? qRow.explanation : null,
    answered: n,
    players: players.length,
    isHost: g.host_id === me,
    joined: players.some((p) => p.id === me),
    mine: my ? { choice: my.choice, correct: shown ? my.correct === 1 : null, points: shown ? my.points : null } : null,
    board: players
      .map((p) => ({ name: p.display_name ?? p.username, look: parseBearLook(p.bear_look), score: p.prev + (shown ? p.cur : 0), isMe: p.id === me }))
      .sort((a, b) => b.score - a.score),
  };
}
