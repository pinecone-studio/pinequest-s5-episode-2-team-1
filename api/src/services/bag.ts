import { type BagItem, type LootKind, rollLoot } from '../../../shared/loot';
import { chestNodes, currentNode, pathLessons } from '../../../shared/path';
import type { ChestOpenResponse, HintResponse, MeResponse } from '../../../shared/types';
import { GAME, type Subject } from '../config/game';
import { livesNow } from '../domain/lives';
import type { Bindings } from '../env';
import { newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { bookLessons } from './lessons';
import { findTaskQuestion } from './tasks';
import { getUserRow, livesArgs, livesOf, loadBag, loadMe, loadSubjectPaths } from './users';

// Цүнх: нууц хайрцгаас гарсан хэрэглэгдэхүүн (shared/loot.ts). Шагнал бүр серверт нэг л удаа олгогдоно.

interface ChestRow {
  kind: LootKind;
  qty: number;
}
const chestRow = (db: D1Database, userId: number, subject: Subject, node: number) =>
  db.prepare('SELECT kind, qty FROM chests WHERE user_id = ? AND subject = ? AND node = ?').bind(userId, subject, node).first<ChestRow>();

/**
 * Давсан хичээлийн зангилааны хайрцгийг нээнэ. Аль хэдийн нээсэн бол тэр шагналаа буцаана (давхар олгохгүй, солигдохгүй):
 * хайрцгийн мөр ба шагнал нэг batch-д, шагнал нь зөвхөн энэ хүсэлтийн tx-ээр үүссэн мөрөөр бичигдэнэ.
 */
export async function openChest(env: Bindings, userId: number, subject: Subject, node: number, now = Date.now(), rand = Math.random): Promise<ChestOpenResponse> {
  const db = env.DB;
  const opened = await chestRow(db, userId, subject, node);
  if (opened) return { node, ...opened, fresh: false, me: await loadMe(db, userId, now) };

  const user = await getUserRow(db, userId);
  const book = await bookLessons(env, subject, user.grade).catch(() => null);
  const n = pathLessons(book?.lessons.length ?? 0);
  if (!chestNodes(n).includes(node)) throw new ApiError(404, 'NOT_FOUND', 'Энд хайрцаг алга');
  const path = (await loadSubjectPaths(db, userId))[subject];
  if (user.is_admin !== 1 && node >= currentNode(n, path.level, path.bossesBeaten)) {
    throw new ApiError(409, 'CHEST_LOCKED', 'Энэ хичээлийг давж байж хайрцаг нээгдэнэ');
  }

  const loot = rollLoot(rand());
  const tx = newTx();
  const mine = 'EXISTS (SELECT 1 FROM chests WHERE user_id = ? AND subject = ? AND node = ? AND tx = ?)';
  const guard = [userId, subject, node, tx] as const;
  await db.batch([
    db
      .prepare('INSERT INTO chests (user_id, subject, node, kind, qty, tx, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(userId, subject, node, loot.kind, loot.qty, tx, now),
    ...(loot.kind === 'coins'
      ? [
          db.prepare(`UPDATE users SET points = points + ? WHERE id = ? AND ${mine}`).bind(loot.qty, userId, ...guard),
          db
            .prepare(`INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at) SELECT ?, ?, 'chest', 'chest', ?, ? WHERE ${mine}`)
            .bind(userId, loot.qty, `${subject}:${node}`, now, ...guard),
        ]
      : [
          db
            .prepare(
              `INSERT INTO inventory (user_id, item, qty) SELECT ?, ?, ? WHERE ${mine}
               ON CONFLICT (user_id, item) DO UPDATE SET qty = qty + excluded.qty`,
            )
            .bind(userId, loot.kind, loot.qty, ...guard),
        ]),
  ]);
  // Зэрэг ирсэн хүсэлт түрүүлсэн бол түүний шагнал (энэ хүсэлтийн шагнал бичигдээгүй)
  const row = await chestRow(db, userId, subject, node);
  if (!row) throw new ApiError(500, 'INTERNAL', 'Хайрцаг нээж чадсангүй');
  return { node, ...row, fresh: true, me: await loadMe(db, userId, now) };
}

/** Нэг ширхэгийг зарцуулна; байхгүй бол NO_ITEM. */
async function spend(db: D1Database, userId: number, item: BagItem) {
  const r = await db.prepare('UPDATE inventory SET qty = qty - 1 WHERE user_id = ? AND item = ? AND qty > 0').bind(userId, item).run();
  if (!r.meta.changes) throw new ApiError(409, 'NO_ITEM', 'Цүнхэнд энэ зүйл алга');
}

/** Зөгийн балны сав: нэг амь нөхнө (дүүрэн бол зарцуулахгүй). */
export async function useHoney(db: D1Database, userId: number, now = Date.now()): Promise<MeResponse> {
  const lives = livesNow(livesOf(await getUserRow(db, userId)), now);
  if (lives.lives >= GAME.LIVES.MAX) throw new ApiError(409, 'LIVES_FULL', 'Амь дүүрэн байна');
  await spend(db, userId, 'honey');
  const next = lives.lives + 1 >= GAME.LIVES.MAX ? { lives: GAME.LIVES.MAX, at: null } : { lives: lives.lives + 1, at: lives.at };
  await db.prepare('UPDATE users SET lives = ?, lives_at = ? WHERE id = ?').bind(...livesArgs(next), userId).run();
  return { me: await loadMe(db, userId, now) };
}

/** Мөсөн хонх: бүх амийг нөхнө (дүүрэн бол зарцуулахгүй). */
export async function useBell(db: D1Database, userId: number, now = Date.now()): Promise<MeResponse> {
  const lives = livesNow(livesOf(await getUserRow(db, userId)), now);
  if (lives.lives >= GAME.LIVES.MAX) throw new ApiError(409, 'LIVES_FULL', 'Амь дүүрэн байна');
  await spend(db, userId, 'bell');
  await db.prepare('UPDATE users SET lives = ?, lives_at = NULL WHERE id = ?').bind(GAME.LIVES.MAX, userId).run();
  return { me: await loadMe(db, userId, now) };
}

/** Буруу хариултуудаас нуух 2 нь (асуулт бүрт тогтмол: дахин дарахад ижил). */
export function hintHide(options: number, correct: number, questionId: number): number[] {
  const wrong = Array.from({ length: options }, (_, i) => i).filter((i) => i !== correct);
  const keep = wrong[questionId % wrong.length];
  return wrong.filter((i) => i !== keep).slice(0, 2);
}

/** Хувын болор: даалгаврын хариулаагүй асуултын 2 буруу хариултыг нууна. Нэг асуултад нэг л удаа зарцуулна. */
export async function useAmber(db: D1Database, userId: number, taskId: number, questionId: number): Promise<HintResponse> {
  const row = await findTaskQuestion(db, userId, taskId, questionId);
  const q = await db
    .prepare('SELECT tq.hint, q.options FROM task_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.task_id = ? AND tq.position = ?')
    .bind(taskId, row.position)
    .first<{ hint: number; options: string }>();
  if (!q) throw new ApiError(404, 'NOT_FOUND', 'Асуулт олдсонгүй');
  if (!q.hint) {
    const mark = await db.prepare('UPDATE task_questions SET hint = 1 WHERE task_id = ? AND position = ? AND hint = 0').bind(taskId, row.position).run();
    if (mark.meta.changes) {
      try {
        await spend(db, userId, 'amber');
      } catch (e) {
        await db.prepare('UPDATE task_questions SET hint = 0 WHERE task_id = ? AND position = ?').bind(taskId, row.position).run();
        throw e;
      }
    }
  }
  const hide = hintHide((JSON.parse(q.options) as string[]).length, row.correct_index, questionId);
  return { hide, bag: await loadBag(db, userId) };
}
