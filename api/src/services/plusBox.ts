import { PLUS_OUTFITS } from '../../../shared/plan';
import type { PlusBoxResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { getUserRow, loadMe } from './users';

// KUMA Plus бэлэг хайрцаг: Plus төлбөр бүрт 1 (users.plus_boxes). Нээхэд Plus-ын онцгой хувцаснаас (shared/plan.ts
// PLUS_OUTFITS) эзэмшээгүй нэгийг санамсаргүй өгнө; бүгдийг эзэмшсэн бол оронд нь боргоцой.

const NO_BOX = () => new ApiError(409, 'NO_PLUS_BOX', 'Бэлэг хайрцаг алга');

export async function openPlusBox(db: D1Database, userId: number, now = Date.now(), rand = Math.random): Promise<PlusBoxResponse> {
  const user = await getUserRow(db, userId);
  if ((user.plus_boxes ?? 0) <= 0) throw NO_BOX();
  const { results } = await db.prepare('SELECT cosmetic_id FROM user_cosmetics WHERE user_id = ?').bind(userId).all<{ cosmetic_id: string }>();
  const owned = new Set(results.map((r) => r.cosmetic_id));
  const left = PLUS_OUTFITS.filter((key) => !owned.has(`outfit_${key}`));
  const outfit = left.length ? left[Math.floor(rand() * left.length)] : null;
  const coins = outfit ? 0 : GAME.PLUS_BOX_COINS;

  // Нэг batch: хайрцаг хасах (CHECK plus_boxes >= 0 нь зэрэг нээлтээс хамгаална) ба шагнал. Аль нэг нь бүтэлгүйтвэл бүгд буцна.
  const take = db.prepare('UPDATE users SET plus_boxes = plus_boxes - 1 WHERE id = ?').bind(userId);
  try {
    await db.batch(
      outfit
        ? [take, db.prepare('INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_at) VALUES (?, ?, ?)').bind(userId, `outfit_${outfit}`, now)]
        : [
            take,
            db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(coins, userId),
            db
              .prepare(`INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, 'plus_box', 'plus_box', NULL, ?)`)
              .bind(userId, coins, now),
          ],
    );
  } catch (e) {
    if (isConstraintError(e, 'CHECK')) throw NO_BOX();
    if (isConstraintError(e, 'UNIQUE')) throw new ApiError(409, 'ALREADY_OWNED', 'Дахин оролдоно уу');
    throw e;
  }
  return { outfit, coins, me: await loadMe(db, userId, now) };
}
