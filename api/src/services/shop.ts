import type { Me, ShopResponse, Slot } from '../../../shared/types';
import { levelFromXp } from '../domain/level';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { getCatalog, parseEquipped } from './items';
import { getUserRow, loadMe } from './users';

async function ownedIds(db: D1Database, userId: number): Promise<Set<string>> {
  const { results } = await db.prepare('SELECT item_id FROM user_items WHERE user_id = ?').bind(userId).all<{ item_id: string }>();
  return new Set(results.map((r) => r.item_id));
}

export async function shopView(db: D1Database, userId: number): Promise<ShopResponse> {
  const [me, catalog, owned] = await Promise.all([loadMe(db, userId), getCatalog(db), ownedIds(db, userId)]);
  const items = [...catalog.values()].map((it) => ({
    id: it.id,
    slot: it.slot,
    name: it.name,
    price: it.price,
    minLevel: it.minLevel,
    style: it.style,
    owned: it.price === 0 || owned.has(it.id),
    equipped: me.equipped[it.slot] === it.id,
    locked: me.level < it.minLevel,
  }));
  return { items, me };
}

/** Оноогоор авч шууд өмсгөнө (нэг batch: эзэмшил, оноо, өмсгөл, ledger). */
export async function buyItem(db: D1Database, userId: number, itemId: string, now = Date.now()): Promise<ShopResponse> {
  const item = (await getCatalog(db)).get(itemId);
  if (!item) throw new ApiError(404, 'NOT_FOUND', 'Эд зүйл олдсонгүй');
  if (item.price === 0) throw new ApiError(409, 'ALREADY_OWNED', 'Үнэгүй эд зүйл');
  const user = await getUserRow(db, userId);
  if (levelFromXp(user.xp) < item.minLevel) throw new ApiError(403, 'ITEM_LOCKED', `${item.minLevel}-р шатнаас нээгдэнэ`);
  const equipped = { ...parseEquipped(user.equipped), [item.slot]: item.id };
  try {
    await db.batch([
      // PRIMARY KEY (user_id, item_id) → давхар авбал batch бүхэлдээ буцна.
      db.prepare('INSERT INTO user_items (user_id, item_id, acquired_at) VALUES (?, ?, ?)').bind(userId, item.id, now),
      db.prepare('UPDATE users SET points = points - ?, equipped = ? WHERE id = ?').bind(item.price, JSON.stringify(equipped), userId),
      db
        .prepare(`INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, 'item_buy', 'item', ?, ?)`)
        .bind(userId, -item.price, item.id, now),
    ]);
  } catch (e) {
    if (isConstraintError(e, 'UNIQUE')) throw new ApiError(409, 'ALREADY_OWNED', 'Аль хэдийн авсан');
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Оноо хүрэлцэхгүй');
    throw e;
  }
  return shopView(db, userId);
}

/** Өмсөх; itemId = null бол (зөвхөн нэмэлт эд зүйлийг) тайлна. */
export async function equipItem(db: D1Database, userId: number, slot: Slot, itemId: string | null): Promise<Me> {
  const user = await getUserRow(db, userId);
  const equipped = parseEquipped(user.equipped);
  if (itemId === null) {
    if (slot !== 'accessory') throw new ApiError(400, 'BAD_REQUEST', 'Зөвхөн нэмэлт эд зүйлийг тайлж болно');
    delete equipped.accessory;
  } else {
    const item = (await getCatalog(db)).get(itemId);
    if (!item || item.slot !== slot) throw new ApiError(400, 'BAD_REQUEST', 'Эд зүйл буруу');
    if (item.price > 0 && !(await ownedIds(db, userId)).has(item.id)) throw new ApiError(403, 'NOT_OWNED', 'Эхлээд авна уу');
    equipped[slot] = item.id;
  }
  await db.prepare('UPDATE users SET equipped = ? WHERE id = ?').bind(JSON.stringify(equipped), userId).run();
  return loadMe(db, userId);
}
