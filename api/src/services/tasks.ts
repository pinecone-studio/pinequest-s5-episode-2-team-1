import type { AnswerResponse, FlagResponse, Me, TaskDto, TaskResult } from '../../../shared/types';
import { GAME, type Subject, type Tier } from '../config/game';
import { bossBlock, bossWon } from '../domain/boss';
import { levelFromXp } from '../domain/level';
import { currentNode } from '../domain/path';
import { taskReward } from '../domain/rewards';
import { shieldBlock } from '../domain/shield';
import { normalizeStreak, registerTaskDay } from '../domain/streak';
import { addDays, ubDay } from '../domain/time';
import type { Bindings } from '../env';
import { isConstraintError, newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import type { PageRange } from './grounding';
import { bookLessons, lessonPages } from './lessons';
import { IN_RANGE, maybeRefill, rangeArgs, refillLesson, refillPool } from './pool';
import { hasPendingRecovery, recoveryCertain, recoveryStatements } from './recovery';
import { countTasksToday, getUserRow, loadMe, loadSubjectPaths, streakStateOf, syncStreak } from './users';

type Ctx = { waitUntil(p: Promise<unknown>): void };

interface TaskRow {
  id: number;
  subject: Subject;
  status: 'in_progress' | 'completed';
  position: number;
  question_id: number;
  choice: number | null;
  correct: number | null;
  prompt: string;
  options: string;
}

export async function loadTask(db: D1Database, userId: number, taskId: number): Promise<TaskDto> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.subject, t.status, tq.position, tq.question_id, tq.choice, tq.correct, q.prompt, q.options
       FROM tasks t
       JOIN task_questions tq ON tq.task_id = t.id
       JOIN questions q ON q.id = tq.question_id
       WHERE t.id = ? AND t.user_id = ?
       ORDER BY tq.position`,
    )
    .bind(taskId, userId)
    .all<TaskRow>();
  if (results.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Даалгавар олдсонгүй');
  const first = results[0];
  return {
    id: first.id,
    subject: first.subject,
    status: first.status,
    // correctIndex энд хэзээ ч явахгүй.
    questions: results.map((r) => ({
      id: r.question_id,
      prompt: r.prompt,
      options: JSON.parse(r.options) as string[],
      answered: r.choice !== null,
    })),
    answeredCount: results.filter((r) => r.choice !== null).length,
    correctCount: results.filter((r) => r.correct === 1).length,
  };
}

/**
 * Шинэ даалгавар (эсвэл өнөөдрийн дуусаагүй ижил хичээлийнхийг) буцаана. `boss` = газрын зургийн тэр бүлгийн
 * boss-той тулаан: ялбал (олонх зөв) дараагийн бүлэг нээгдэнэ.
 */
export async function startTask(
  env: Bindings,
  ctx: Ctx,
  userId: number,
  subject: Subject,
  boss?: number,
  now = Date.now(),
): Promise<TaskDto> {
  const db = env.DB;
  const user = await getUserRow(db, userId);
  const tier = user.tier as Tier;
  const today = ubDay(now);
  if (await hasPendingRecovery(db, userId, subject)) {
    throw new ApiError(409, 'RECOVERY_REQUIRED', 'Эхлээд давтлагаа дуусгаарай');
  }
  const path = (await loadSubjectPaths(db, userId))[subject];
  if (boss !== undefined) {
    // Boss хаалт хичээл бүрийн сурах замаар: математикийн boss-ыг ялсан нь физикийн бүлгийг нээхгүй.
    const block = bossBlock(path.level, path.bossesBeaten, boss);
    if (block) throw new ApiError(409, block, 'Энэ boss-той тулалдах боломжгүй');
  }

  const existing = await db
    .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1`)
    .bind(userId, subject, today)
    .first<{ id: number }>();
  if (existing) {
    // Дуусаагүй даалгаврыг хаанаас нээсэн нь (газрын зургийн boss эсвэл ердийн) түүний төрлийг шийднэ.
    await db.prepare('UPDATE tasks SET boss = ? WHERE id = ?').bind(boss ?? null, existing.id).run();
    return loadTask(db, userId, existing.id);
  }

  if ((await countTasksToday(db, userId, today)) >= GAME.DAILY_TASK_LIMIT) {
    throw new ApiError(429, 'DAILY_LIMIT', 'Өнөөдрийн хязгаар дууссан');
  }

  // Апп-ын харуулж буй зангилааны сурах бичгийн хичээл: асуулт нь тэр хуудсуудаас. Хүрэлцэхгүй бол тэр хуудсаар
  // үүсгэнэ (удвал хүлээхгүй, дутууг нь бусад асуултаар). Ном, хичээл байхгүй (boss) бол хичээлийн бүх асуултаас.
  const node = currentNode(path.level, path.bossesBeaten);
  const book = await bookLessons(env, subject, user.grade).catch(() => null);
  const lesson = book && lessonPages(book, node);
  const lessonRefill = (range: PageRange) =>
    refillLesson(env, tier, subject, range, userId).catch((e) => console.error('[pool] lesson refill failed', e));
  if (lesson) {
    const refill = lessonRefill(lesson);
    ctx.waitUntil(refill);
    await Promise.race([refill, new Promise((r) => setTimeout(r, GAME.POOL.LESSON_WAIT_MS))]);
  }

  // Хараагүй асуултыг (хичээлийнхийг түрүүлж) санамсаргүйгээр, дутвал хамгийн эрт харсныг нь.
  const { results: picked } = await db
    .prepare(
      `SELECT q.id FROM questions q
       LEFT JOIN seen_questions s ON s.question_id = q.id AND s.user_id = ?
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0
       ORDER BY (s.seen_at IS NOT NULL), ${lesson ? `${IN_RANGE} DESC,` : ''} s.seen_at, RANDOM()
       LIMIT ?`,
    )
    .bind(userId, tier, subject, ...(lesson ? rangeArgs(lesson) : []), GAME.QUESTIONS_PER_TASK)
    .all<{ id: number }>();
  if (picked.length < GAME.QUESTIONS_PER_TASK) {
    ctx.waitUntil(refillPool(env, tier, subject));
    throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй байна');
  }

  // Даалгавар ба асуултуудыг нэг batch-аар (хагас үүсэхгүй). Өдрийн хязгаар болон "энэ хичээлээр
  // дуусаагүй даалгавар байхгүй" нөхцөлийг INSERT дотор шалгана: зэрэг ирсэн хүсэлт давхар үүсгэхгүй.
  const tx = newTx();
  const taskId = '(SELECT id FROM tasks WHERE tx = ?)';
  const tq = db.prepare(`INSERT INTO task_questions (task_id, position, question_id) SELECT ${taskId}, ?, ? WHERE ${taskId} IS NOT NULL`);
  const seen = db.prepare(
    `INSERT INTO seen_questions (user_id, question_id, seen_at) SELECT ?, ?, ? WHERE ${taskId} IS NOT NULL
     ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
  );
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (user_id, subject, day, status, boss, tx, created_at)
         SELECT ?, ?, ?, 'in_progress', ?, ?, ?
         WHERE (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND day = ?) < ?
           AND NOT EXISTS (SELECT 1 FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress')`,
      )
      .bind(userId, subject, today, boss ?? null, tx, now, userId, today, GAME.DAILY_TASK_LIMIT, userId, subject, today),
    ...picked.map((q, i) => tq.bind(tx, i, q.id, tx)),
    ...picked.map((q) => seen.bind(userId, q.id, now, tx)),
  ]);
  const created = await db.prepare('SELECT id FROM tasks WHERE tx = ?').bind(tx).first<{ id: number }>();
  if (!created) {
    // Зэрэг ирсэн хүсэлт энэ хичээлийн даалгаврыг түрүүлж үүсгэсэн бол түүнийг буцаана.
    const other = await db
      .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress'`)
      .bind(userId, subject, today)
      .first<{ id: number }>();
    if (other) return loadTask(db, userId, other.id);
    throw new ApiError(429, 'DAILY_LIMIT', 'Өнөөдрийн хязгаар дууссан');
  }

  // Дараагийн зангилааны хичээлийн асуултыг даалгавар хийх хооронд бэлдэнэ.
  const next = book && lessonPages(book, node + 1);
  if (next) ctx.waitUntil(lessonRefill(next));
  await maybeRefill(env, ctx, tier, subject, userId);
  return loadTask(db, userId, created.id);
}

interface AnswerRow {
  user_id: number;
  status: string;
  position: number;
  choice: number | null;
  correct_index: number;
  explanation: string;
}

async function findTaskQuestion(db: D1Database, userId: number, taskId: number, questionId: number): Promise<AnswerRow> {
  const row = await db
    .prepare(
      `SELECT t.user_id, t.status, tq.position, tq.choice, q.correct_index, q.explanation
       FROM tasks t
       JOIN task_questions tq ON tq.task_id = t.id
       JOIN questions q ON q.id = tq.question_id
       WHERE t.id = ? AND tq.question_id = ?`,
    )
    .bind(taskId, questionId)
    .first<AnswerRow>();
  if (!row || row.user_id !== userId) throw new ApiError(404, 'NOT_FOUND', 'Асуулт олдсонгүй');
  if (row.status !== 'in_progress') throw new ApiError(409, 'TASK_CLOSED', 'Даалгавар дууссан');
  if (row.choice !== null) throw new ApiError(409, 'ALREADY_ANSWERED', 'Хариулсан асуулт');
  return row;
}

/** choice: 0–3, эсвэл -1 = "Асуулт буруу байна" (алгассан). */
async function recordChoice(db: D1Database, userId: number, taskId: number, row: AnswerRow, choice: number, now: number) {
  const correct = choice === row.correct_index;
  const upd = await db
    .prepare('UPDATE task_questions SET choice = ?, correct = ?, answered_at = ? WHERE task_id = ? AND position = ? AND choice IS NULL')
    .bind(choice, correct ? 1 : 0, now, taskId, row.position)
    .run();
  if (!upd.meta.changes) throw new ApiError(409, 'ALREADY_ANSWERED', 'Хариулсан асуулт');
  // flag (-1) нь жинхэнэ алдаа биш
  const count = await db
    .prepare('SELECT SUM(choice IS NULL) AS open, SUM(choice >= 0 AND correct = 0) AS wrong FROM task_questions WHERE task_id = ?')
    .bind(taskId)
    .first<{ open: number; wrong: number }>();
  const finished = (count?.open ?? 0) === 0;
  const recovery = finished ? await recoveryStatements(db, userId, taskId, now) : [];
  const result = finished ? await completeTask(db, userId, taskId, now, recovery) : undefined;
  return { correct, finished, result, recovery: recovery.length > 0, wrong: count?.wrong ?? 0 };
}

export async function answerTask(
  db: D1Database,
  userId: number,
  taskId: number,
  questionId: number,
  choice: number,
  now = Date.now(),
): Promise<AnswerResponse> {
  const row = await findTaskQuestion(db, userId, taskId, questionId);
  const r = await recordChoice(db, userId, taskId, row, choice, now);
  // Буруу бол зөв хариу, тайлбарыг зөвхөн салаа зам заавал нээгдэх үед (2 дахь алдаанаас) хэлэхгүй: тэнд өөрөө
  // дахин бодно. Ганц алдаатай бол салаа зам нээгдэхгүй тул зөв хариуг тэр дор нь харуулна.
  const reveal = r.correct || !recoveryCertain(r.wrong) ? { correctIndex: row.correct_index, explanation: row.explanation } : {};
  return { correct: r.correct, ...reveal, finished: r.finished, result: r.result, recovery: r.recovery };
}

/** Асуултыг flagged болгоно (дахин хэнд ч гарахгүй); даалгаврын дунд бол алгасна. */
export async function flagQuestion(
  db: D1Database,
  userId: number,
  questionId: number,
  taskId: number | undefined,
  now = Date.now(),
): Promise<FlagResponse> {
  // Зөвхөн өөрт гарсан асуултыг: дурын id-гаар pool-ыг хоослохоос сэргийлнэ.
  const seen = await db.prepare('SELECT 1 FROM seen_questions WHERE user_id = ? AND question_id = ?').bind(userId, questionId).first();
  if (!seen) throw new ApiError(404, 'NOT_FOUND', 'Асуулт олдсонгүй');
  await db.prepare('UPDATE questions SET flagged = 1, flagged_by = ? WHERE id = ? AND flagged = 0').bind(userId, questionId).run();
  if (taskId === undefined) return { ok: true, finished: false };

  const row = await db
    .prepare(
      `SELECT t.user_id, t.status, tq.position, tq.choice, q.correct_index, q.explanation
       FROM tasks t JOIN task_questions tq ON tq.task_id = t.id JOIN questions q ON q.id = tq.question_id
       WHERE t.id = ? AND tq.question_id = ?`,
    )
    .bind(taskId, questionId)
    .first<AnswerRow>();
  // Хариулсан эсвэл дууссан даалгаварт flag л тэмдэглэгдэнэ.
  if (!row || row.user_id !== userId || row.status !== 'in_progress' || row.choice !== null) return { ok: true, finished: false };
  const r = await recordChoice(db, userId, taskId, row, -1, now);
  return { ok: true, finished: r.finished, result: r.result, recovery: r.recovery };
}

/**
 * Даалгаврыг дуусгаж шагнал олгоно (нэг batch, атомик). Streak-ийг эхлээд бүртгэж,
 * шинэчлэгдсэн streak-ийн үржвэрээр оноо бодно.
 */
/** `extra` = нэг batch-д хамт бичих statement-ууд (салаа зам). */
export async function completeTask(
  db: D1Database,
  userId: number,
  taskId: number,
  now = Date.now(),
  extra: D1PreparedStatement[] = [],
): Promise<TaskResult> {
  const today = ubDay(now);
  const user = await getUserRow(db, userId);
  const normalized = normalizeStreak(streakStateOf(user), today);
  const after = registerTaskDay(normalized.state, today);
  const cc = await db
    .prepare('SELECT t.subject, t.boss, (SELECT COUNT(*) FROM task_questions WHERE task_id = t.id AND correct = 1) AS n FROM tasks t WHERE t.id = ?')
    .bind(taskId)
    .first<{ subject: Subject; boss: number | null; n: number }>();
  if (!cc) throw new ApiError(404, 'NOT_FOUND', 'Даалгавар олдсонгүй');
  const correctCount = cc.n;
  const reward = taskReward(correctCount, after.streak);
  const path = (await loadSubjectPaths(db, userId))[cc.subject];
  // Тухайн хичээлийн дараагийн boss-ыг ялбал тэр хичээлийн дараагийн бүлэг нээгдэнэ (bosses_beaten = boss нөхцөл
  // давхар тоолохоос сэргийлнэ).
  const beatBoss = cc.boss != null && cc.boss === path.bossesBeaten && bossWon(correctCount);

  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM tasks WHERE id = ? AND tx = ?)';
  const results = await db.batch([
    db
      .prepare(
        `UPDATE tasks SET status = 'completed', correct_count = ?, points_awarded = ?, xp_awarded = ?, multiplier = ?,
           streak_after = ?, completed_at = ?, tx = ?
         WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      )
      .bind(correctCount, reward.points, reward.xp, reward.multiplier, after.streak, now, tx, taskId, userId),
    db
      .prepare(
        // shield_held-ийг харьцангуйгаар: хооронд нь авсан хамгаалалтыг дарж бичихгүй.
        `UPDATE users SET xp = xp + ?, points = points + ?, streak = ?, last_streak_day = ?,
           shield_held = MAX(shield_held - ?, 0), shield_used_day = ?
         WHERE id = ? AND ${guard}`,
      )
      .bind(
        reward.xp,
        reward.points,
        after.streak,
        after.lastDay,
        normalized.shieldConsumed ? 1 : 0,
        after.shieldUsedDay,
        userId,
        taskId,
        tx,
      ),
    db
      .prepare(
        `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
         SELECT ?, ?, 'task_reward', 'task', ?, ? WHERE ? > 0 AND ${guard}`,
      )
      .bind(userId, reward.points, String(taskId), now, reward.points, taskId, tx),
    // Хичээлийн сурах зам: XP нь нийт дээр нэмэгдэхээс гадна тухайн хичээлийн замыг урагшлуулна.
    db
      .prepare(
        `INSERT INTO subject_progress (user_id, subject, xp) SELECT ?, ?, ? WHERE ${guard}
         ON CONFLICT (user_id, subject) DO UPDATE SET xp = xp + excluded.xp`,
      )
      .bind(userId, cc.subject, reward.xp, taskId, tx),
    ...(beatBoss
      ? [
          db
            .prepare(
              `UPDATE subject_progress SET bosses_beaten = bosses_beaten + 1
               WHERE user_id = ? AND subject = ? AND bosses_beaten = ? AND ${guard}`,
            )
            .bind(userId, cc.subject, path.bossesBeaten, taskId, tx),
        ]
      : []),
    ...extra,
  ]);
  if (!results[0].meta.changes) throw new ApiError(409, 'TASK_CLOSED', 'Даалгавар аль хэдийн дууссан');

  const me = await loadMe(db, userId, now);
  return {
    correctCount,
    total: GAME.QUESTIONS_PER_TASK,
    pointsGained: reward.points,
    xpGained: reward.xp,
    multiplier: reward.multiplier,
    streak: after.streak,
    shieldUsed: normalized.shieldConsumed,
    levelBefore: levelFromXp(user.xp),
    levelAfter: me.level,
    me,
  };
}

/** Streak хамгаалалт: 50 оноо, гартаа нэгээс илүүгүй, 7 хоногт нэг. */
export async function buyShield(db: D1Database, userId: number, now = Date.now()): Promise<Me> {
  const today = ubDay(now);
  const user = await syncStreak(db, await getUserRow(db, userId), today);
  const block = shieldBlock(streakStateOf(user), user.points, today);
  if (block) throw new ApiError(409, block, 'Хамгаалалт авах боломжгүй');

  const tx = newTx();
  const cutoff = addDays(today, -GAME.SHIELD.COOLDOWN_DAYS);
  try {
    const res = await db.batch([
      db
        .prepare(
          `UPDATE users SET points = points - ?, shield_held = shield_held + 1, shield_bought_day = ?, tx = ?
           WHERE id = ? AND shield_held < ? AND (shield_bought_day IS NULL OR shield_bought_day <= ?)`,
        )
        .bind(GAME.SHIELD.PRICE, today, tx, userId, GAME.SHIELD.MAX_HELD, cutoff),
      db
        .prepare(
          `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
           SELECT ?, ?, 'shield_buy', 'shield', ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND tx = ?)`,
        )
        .bind(userId, -GAME.SHIELD.PRICE, today, now, userId, tx),
    ]);
    if (!res[0].meta.changes) throw new ApiError(409, 'SHIELD_HELD', 'Хамгаалалт авах боломжгүй');
  } catch (e) {
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Оноо хүрэлцэхгүй');
    throw e;
  }
  return loadMe(db, userId, now);
}
