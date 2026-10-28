import { GATE_ITEM } from '../../../shared/loot';
import type { AnswerResponse, FlagResponse, Me, TaskDto, TaskResult } from '../../../shared/types';
import { GAME, type Subject, type Tier } from '../config/game';
import { mathRoadmapNodes } from '../config/mathRoadmap';
import { bossBlock, bossWon } from '../domain/boss';
import { levelFromXp } from '../domain/level';
import { currentNode, gateNodes, gateOf, lessonIndex, nodesAfter, pathLessons, taskPathLessons } from '../domain/path';
import { ADVANCE_STAGE, GATE_BONUS, GATE_STAGE, STAGES, stageDone } from '../../../shared/path';
import { taskReward } from '../domain/rewards';
import { shieldBlock } from '../domain/shield';
import { normalizeStreak, registerTaskDay } from '../domain/streak';
import { addDays, ubDay } from '../domain/time';
import type { Bindings } from '../env';
import { isConstraintError, newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import type { PageRange } from './grounding';
import { bookLessons, lessonPages } from './lessons';
import { levelOf, shouldGenerateTemplates, templateById, templateRange, templatesFor } from '../templates';
import {
  CURATED_LESSON_COUNT_SQL,
  generateTemplateSet,
  LESSON_COUNT_SQL,
  lessonRef,
  maybeRefill,
  pickQuestions,
  rangeArgs,
  refillLesson,
  refillPool,
} from './pool';
import { hasPendingRecovery, recoveryCertain, recoveryStatements } from './recovery';
import { spendLife } from '../domain/lives';
import { countTasksToday, getUserRow, livesArgs, loadMe, loadSubjectPaths, requireLife, streakStateOf, syncStreak } from './users';

/** Номын сан (замын урт номын хичээлийн тооноос хамаарна). */
type Books = Pick<Bindings, 'BOOKS'>;

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
 * Шинэ даалгавар (эсвэл өнөөдрийн дуусаагүй ижил зангилаа, шатныхыг) буцаана. `boss` = газрын зургийн тэр хаалгатай
 * тулаан: ялбал (олонх зөв) дараагийн хаалга нээгдэнэ. Хичээлийн зангилаа бол `stage` шатны (1 Суурь, 2 Дунд,
 * 3 Ахисан) бодлого; өгөөгүй бол дараагийн давах шат.
 */
export async function startTask(
  env: Bindings,
  ctx: Ctx,
  userId: number,
  subject: Subject,
  /** тулааны хаалга (GAME.BOSS.GATES-ийн индекс) */
  boss?: number,
  /** газрын зургийн сонгосон зангилаа: энгийн хэрэглэгчид одоогийн эсвэл давсан хичээлийн зангилаа (admin бүгд) */
  pick?: number,
  stage?: number,
  now = Date.now(),
): Promise<TaskDto> {
  const db = env.DB;
  const user = await getUserRow(db, userId);
  const tier = user.tier as Tier;
  const today = ubDay(now);
  const admin = user.is_admin === 1;
  if (!admin && (await hasPendingRecovery(db, userId, subject))) {
    throw new ApiError(409, 'RECOVERY_REQUIRED', 'Эхлээд давтлагаа дуусгаарай');
  }
  const path = (await loadSubjectPaths(db, userId))[subject];
  // Математик 6–12 нь анги тус бүрийн тогтмол roadmap; бусад нь номын хичээл бүр нэг зангилаа.
  const roadmap = subject === 'math' ? mathRoadmapNodes(user.grade) : [];
  const book = roadmap.length > 0 ? null : await bookLessons(env, subject, user.grade).catch(() => null);
  const pathLen = roadmap.length || pathLessons(book?.lessons.length ?? 0);
  if (boss !== undefined && !admin) {
    // Boss хаалт хичээл бүрийн сурах замаар: математикийн boss-ыг ялсан нь физикийн бүлгийг нээхгүй.
    const block = bossBlock(pathLen, path.level, path.bossesBeaten, boss);
    if (block) throw new ApiError(409, block, 'Энэ boss-той тулалдах боломжгүй');
  }

  // хаалганы тулаан тэр зангилааны хичээлээр (энгийн хэрэглэгчид bossBlock-ийн дараа одоогийн зангилаа = хаалга)
  const current = currentNode(pathLen, path.level, path.bossesBeaten);
  if (pick !== undefined && !admin && (pick > current || gateOf(pathLen, pick) >= 0)) {
    throw new ApiError(409, 'NODE_LOCKED', 'Энэ зангилаа хаалттай байна');
  }
  const node = boss !== undefined ? gateNodes(pathLen)[boss] : (pick ?? current);
  // Хаалганы тулаан, хаалган дээрх ердийн даалгавар шатгүй. Шат дарааллаар нээгдэнэ (admin бүгд).
  const done = stageDone(path.stages, node, current);
  const stageNo = boss !== undefined || gateOf(pathLen, node) >= 0 ? null : (stage ?? Math.min(STAGES, done + 1));
  if (stageNo !== null && stageNo > done + 1 && !admin) throw new ApiError(409, 'STAGE_LOCKED', 'Өмнөх шатаа давж байж энэ шат нээгдэнэ');

  const existing = await db
    .prepare(`SELECT id, boss, node, stage FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'path' ORDER BY id DESC LIMIT 1`)
    .bind(userId, subject, today)
    .first<{ id: number; boss: number | null; node: number | null; stage: number | null }>();
  if (existing && existing.boss === (boss ?? null) && existing.node === node && existing.stage === stageNo) {
    return loadTask(db, userId, existing.id);
  }
  // Шинэ зангилаа руу орох бүрт нэг амь (дуусаагүй ижил даалгаврыг үргэлжлүүлэх үнэгүй); амьгүй бол хаалттай.
  const lives = requireLife(user, now);
  if (existing) {
    // Өөр зангилаа, шат, хаалга сонговол өнөөдрийн дуусаагүй даалгаврыг орхино (оноо, XP зөвхөн дуусгахад олгогддог)
    await db.prepare(`DELETE FROM tasks WHERE id = ? AND status = 'in_progress'`).bind(existing.id).run();
  }

  // Асуулт зөвхөн хэрэглэгчийн ангийн номынх (эсвэл номгүй), өөр ангийн номоос хэзээ ч биш. Апп-ын харуулж буй
  // зангилааны хичээлийн хуудсаас (харсан ч) түрүүлж; хараагүй нь дутвал тэр хуудсаар үүсгэнэ. Хичээлд асуулт огт
  // хүрэлцэхгүй үед л хүлээж (удвал хүлээхгүй), дутууг ангийн бусад асуултаар. Ном, хичээл байхгүй (boss) бол ангийн бүх асуултаас.
  const mappedIndex = lessonIndex(pathLen, node);
  const mapped = mappedIndex === null ? null : (roadmap[mappedIndex] ?? null);
  const mappedTemplates = mapped?.templateIds.flatMap((id) => {
    const template = templateById(id);
    return template ? [template] : [];
  }) ?? [];
  const mappedRef = mapped?.ref ?? mappedTemplates[0]?.ref;
  const lesson = mappedRef ? templateRange(mappedRef) : book ? lessonPages(book, node) : null;
  const lessonRefill = (range: PageRange) =>
    refillLesson(env, tier, subject, { grade: user.grade, range }, userId).catch((e) => console.error('[pool] lesson refill failed', e));
  // Суурь шат curated DB асуултаас; Дунд, Ахисан шат template-тэй бол түүнээс. 11–12-р ангийн template-гүй
  // хичээлүүд шат бүрийн difficulty-тэй DB асуултаа ашиглана. Шатгүй урсгалд ерөнхий template нь DB дутвал нөөц болно.
  const templates = mapped ? mappedTemplates : lesson ? templatesFor(lesson) : [];
  const basic = stageNo === 1;
  const preferStored = stageNo === null && templates.length > 0 && templates.every((template) => template.preferStored);
  const storedFirst = basic || preferStored || mapped?.ref !== undefined;
  const storedBefore =
    lesson && storedFirst
      ? ((
          await db
            .prepare(basic ? CURATED_LESSON_COUNT_SQL : LESSON_COUNT_SQL)
            .bind(tier, subject, ...rangeArgs(lesson))
            .first<{ n: number }>()
        )?.n ?? 0)
      : 0;
  // Шатны хүнд (1 Суурь … 3 Ахисан): загвар тэр хүндээр үүсгэж, хадгалсан бодлогоос тэр хүндийг түрүүлж сонгоно.
  const level = levelOf(stageNo ?? (boss === undefined ? null : (GATE_STAGE[boss] ?? null)));
  const made = shouldGenerateTemplates(templates, storedBefore, GAME.QUESTIONS_PER_TASK, stageNo)
    ? await generateTemplateSet(db, tier, subject, user.grade, templates, GAME.QUESTIONS_PER_TASK, level, now)
    : [];
  if (lesson && (storedFirst ? storedBefore < GAME.QUESTIONS_PER_TASK : made.length < GAME.QUESTIONS_PER_TASK)) {
    const refill = lessonRefill(lesson);
    ctx.waitUntil(refill);
    // Хичээлд нэг даалгаварт хүрэлцэх асуулт байвал (хүүхэд харсан ч) хүлээхгүй: тэднийг давтана, шинэ нь background-д.
    if (made.length < GAME.QUESTIONS_PER_TASK) {
      const have = await db
        .prepare(LESSON_COUNT_SQL)
        .bind(tier, subject, ...rangeArgs(lesson))
        .first<{ n: number }>();
      if ((have?.n ?? 0) < GAME.QUESTIONS_PER_TASK) await Promise.race([refill, new Promise((r) => setTimeout(r, GAME.POOL.LESSON_WAIT_MS))]);
    }
  }

  // Загвар хүрэлцээгүй бол (Дунд, Ахисан шат ч) хадгалсан бодлогоос шатны хүндээр нөхнө; Суурь шат загвараас
  // үүссэн мөрийг сонгохгүй.
  const picked =
    made.length >= GAME.QUESTIONS_PER_TASK
      ? made.map((id) => ({ id }))
      : await pickQuestions(db, userId, tier, subject, lesson, GAME.QUESTIONS_PER_TASK, level, basic);
  if (picked.length < GAME.QUESTIONS_PER_TASK) {
    ctx.waitUntil(refillPool(env, tier, subject, { grade: user.grade }));
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
        `INSERT INTO tasks (user_id, subject, day, status, boss, lesson_ref, path_lessons, node, stage, tx, created_at)
         SELECT ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'path')`,
      )
      .bind(userId, subject, today, boss ?? null, lesson ? lessonRef(lesson) : null, pathLen, node, stageNo, tx, now, userId, subject, today),
    ...picked.map((q, i) => tq.bind(tx, i, q.id, tx)),
    ...picked.map((q) => seen.bind(userId, q.id, now, tx)),
    // shortcut: зэрэг эхлүүлсэн хоёр хичээлийн даалгавар нэг амь зарцуулж болно (утга нь шууд бичигдэнэ); амийг
    // харьцангуйгаар (lives - 1) бичих хэрэгтэй болбол тоолуурыг SQL-д шилжүүлнэ.
    ...(admin
      ? []
      : [
          db
            .prepare(`UPDATE users SET lives = ?, lives_at = ? WHERE id = ? AND ${taskId} IS NOT NULL`)
            .bind(...livesArgs(spendLife(lives, now)), userId, tx),
        ]),
  ]);
  const created = await db.prepare('SELECT id FROM tasks WHERE tx = ?').bind(tx).first<{ id: number }>();
  if (!created) {
    // Зэрэг ирсэн хүсэлт энэ хичээлийн даалгаврыг түрүүлж үүсгэсэн бол түүнийг буцаана.
    const other = await db
      .prepare(`SELECT id FROM tasks WHERE user_id = ? AND subject = ? AND day = ? AND status = 'in_progress' AND kind = 'path'`)
      .bind(userId, subject, today)
      .first<{ id: number }>();
    if (other) return loadTask(db, userId, other.id);
    throw new ApiError(500, 'INTERNAL', 'Даалгавар үүсгэж чадсангүй');
  }

  // Дараагийн зангилааны хичээлийн асуултыг даалгавар хийх хооронд бэлдэнэ.
  const next = book && lessonPages(book, node + 1);
  if (next && !templatesFor(next).some((template) => !template.preferStored)) ctx.waitUntil(lessonRefill(next));
  await maybeRefill(env, ctx, tier, subject, userId, user.grade);
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

export async function findTaskQuestion(db: D1Database, userId: number, taskId: number, questionId: number): Promise<AnswerRow> {
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
async function recordChoice(db: D1Database, books: Books, userId: number, taskId: number, row: AnswerRow, choice: number, now: number) {
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
  const result = finished ? await completeTask(db, books, userId, taskId, now, recovery) : undefined;
  return { correct, finished, result, recovery: recovery.length > 0, wrong: count?.wrong ?? 0 };
}

export async function answerTask(
  db: D1Database,
  books: Books,
  userId: number,
  taskId: number,
  questionId: number,
  choice: number,
  now = Date.now(),
): Promise<AnswerResponse> {
  const row = await findTaskQuestion(db, userId, taskId, questionId);
  const r = await recordChoice(db, books, userId, taskId, row, choice, now);
  // Буруу бол зөв хариу, тайлбарыг зөвхөн салаа зам заавал нээгдэх үед (2 дахь алдаанаас) хэлэхгүй: тэнд өөрөө
  // дахин бодно. Ганц алдаатай бол салаа зам нээгдэхгүй тул зөв хариуг тэр дор нь харуулна.
  const reveal = r.correct || !recoveryCertain(r.wrong) ? { correctIndex: row.correct_index, explanation: row.explanation } : {};
  return { correct: r.correct, ...reveal, finished: r.finished, result: r.result, recovery: r.recovery };
}

/** Асуултыг flagged болгоно (дахин хэнд ч гарахгүй); даалгаврын дунд бол алгасна. */
export async function flagQuestion(
  db: D1Database,
  books: Books,
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
  const r = await recordChoice(db, books, userId, taskId, row, -1, now);
  return { ok: true, finished: r.finished, result: r.result, recovery: r.recovery };
}

/**
 * Даалгаврыг дуусгаж шагнал олгоно (нэг batch, атомик). Streak-ийг эхлээд бүртгэж,
 * шинэчлэгдсэн streak-ийн үржвэрээр оноо бодно.
 */
/** `extra` = нэг batch-д хамт бичих statement-ууд (салаа зам). */
export async function completeTask(
  db: D1Database,
  books: Books,
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
    .prepare(
      `SELECT t.subject, t.kind, t.boss, t.path_lessons, t.node, t.stage,
         (SELECT COUNT(*) FROM task_questions WHERE task_id = t.id AND correct = 1) AS n
       FROM tasks t WHERE t.id = ?`,
    )
    .bind(taskId)
    .first<{ subject: Subject; kind: string; boss: number | null; path_lessons: number | null; node: number | null; stage: number | null; n: number }>();
  if (!cc) throw new ApiError(404, 'NOT_FOUND', 'Даалгавар олдсонгүй');
  const correctCount = cc.n;
  const base = taskReward(correctCount, after.streak);
  const path = (await loadSubjectPaths(db, userId))[cc.subject];
  // Тухайн хичээлийн дараагийн boss-ыг ялбал тэр хичээлийн дараагийн бүлэг нээгдэнэ (bosses_beaten = boss нөхцөл
  // давхар тоолохоос сэргийлнэ).
  const beatBoss = cc.boss != null && cc.boss === path.bossesBeaten && bossWon(correctCount);
  const gateItem = beatBoss && cc.boss != null ? GATE_ITEM[cc.boss] : undefined;
  // Хаалгыг анх давахад нэг удаагийн шагнал (давсан хаалгатай дахин тулалдах боломжгүй тул давхардахгүй)
  const reward = { ...base, points: base.points + (beatBoss && cc.boss != null ? (GATE_BONUS[cc.boss] ?? 0) : 0) };
  const nodes = path.level - 1;
  // Даалгавар эхлэх үеийн замын урт (дунд нь ном солигдсон ч тэр зангилааг дуусгана); 0020-оос өмнө эхэлсэнд одоогийн номынх
  const bookCount =
    cc.path_lessons === null ? ((await bookLessons(books, cc.subject, user.grade).catch(() => null))?.lessons.length ?? 0) : 0;
  const n = taskPathLessons(cc.path_lessons, bookCount);
  // Шатны даалгавар: давбал тэр шат тэмдэглэгдэнэ; зам зөвхөн одоогийн зангилааны ADVANCE_STAGE-аас дээш шатаар ахина.
  const stagePassed = cc.stage !== null && correctCount >= GAME.PATH_PASS_CORRECT;
  // Өнөөдрийн хичээл (давтах дасгал) замд нөлөөлөхгүй: зөвхөн оноо, XP, дараалал.
  const review = cc.kind === 'review';
  const advances = !review && (cc.stage === null || (cc.stage >= ADVANCE_STAGE && cc.node === currentNode(n, path.level, path.bossesBeaten)));
  const nodesNext = advances ? nodesAfter(n, nodes, path.bossesBeaten, correctCount, beatBoss) : nodes;

  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM tasks WHERE id = ? AND tx = ?)';
  // Зангилаа ба boss: уншсан утгаараа шалгаж (зэрэг дууссан даалгавар давхар ахиулахгүй).
  const progress = nodesNext !== nodes || beatBoss
    ? db
        .prepare(
          `UPDATE subject_progress SET nodes = ?, bosses_beaten = ?
           WHERE user_id = ? AND subject = ? AND nodes = ? AND bosses_beaten = ? AND ${guard}`,
        )
        .bind(nodesNext, path.bossesBeaten + (beatBoss ? 1 : 0), userId, cc.subject, nodes, path.bossesBeaten, taskId, tx)
    : null;
  const statements = [
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
    ...(progress ? [progress] : []),
    // Хаалгыг үнэхээр ахиулсан хүсэлтэд л шагнал: changes() нь яг өмнөх UPDATE-ийн үр дүн.
    ...(gateItem
      ? [
          db
            .prepare(
              `INSERT INTO inventory (user_id, item, qty) SELECT ?, ?, 1 WHERE changes() > 0 AND ${guard}
               ON CONFLICT (user_id, item) DO UPDATE SET qty = qty + 1`,
            )
            .bind(userId, gateItem, taskId, tx),
        ]
      : []),
    ...(stagePassed
      ? [
          db
            .prepare(
              `INSERT INTO node_stages (user_id, subject, node, stage) SELECT ?, ?, ?, ? WHERE ${guard}
               ON CONFLICT (user_id, subject, node) DO UPDATE SET stage = MAX(stage, excluded.stage)`,
            )
            .bind(userId, cc.subject, cc.node, cc.stage, taskId, tx),
        ]
      : []),
    ...extra,
  ];
  const results = await db.batch(statements);
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
    nodeUp: me.paths[cc.subject].level > path.level,
    gate: cc.boss,
    gateBeaten: Boolean(beatBoss && progress && results[statements.indexOf(progress)].meta.changes),
    stage: cc.stage,
    stagePassed,
    review,
    me,
  };
}

/** Streak хамгаалалт: 50 зөгийн бал, гартаа нэгээс илүүгүй, 7 хоногт нэг. */
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
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Зөгийн бал хүрэлцэхгүй');
    throw e;
  }
  return loadMe(db, userId, now);
}
