import type { CosmeticsResponse, Me, ShopResponse, Slot } from '../../../shared/types';
import { COSMETICS, cosmeticById } from '../config/cosmetics';
import { levelFromXp } from '../domain/level';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { getCatalog } from './items';
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

/** `equipped` JSON-ийн нэг slot-ыг SQL дотор өөрчилнө: зэрэг ирсэн өөр өмсгөлийг дарж бичихгүй. */
const SET_SLOT = `equipped = json_set(CASE WHEN json_valid(equipped) THEN equipped ELSE '{}' END, '$.' || ?, ?)`;

/** Оноогоор авч шууд өмсгөнө (нэг batch: эзэмшил, оноо, өмсгөл, ledger). */
export async function buyItem(db: D1Database, userId: number, itemId: string, now = Date.now()): Promise<ShopResponse> {
  const item = (await getCatalog(db)).get(itemId);
  if (!item) throw new ApiError(404, 'NOT_FOUND', 'Эд зүйл олдсонгүй');
  if (item.price === 0) throw new ApiError(409, 'ALREADY_OWNED', 'Үнэгүй эд зүйл');
  const user = await getUserRow(db, userId);
  if (levelFromXp(user.xp) < item.minLevel) throw new ApiError(403, 'ITEM_LOCKED', `${item.minLevel}-р шатнаас нээгдэнэ`);
  try {
    await db.batch([
      // PRIMARY KEY (user_id, item_id) → давхар авбал batch бүхэлдээ буцна.
      db.prepare('INSERT INTO user_items (user_id, item_id, acquired_at) VALUES (?, ?, ?)').bind(userId, item.id, now),
      db.prepare(`UPDATE users SET points = points - ?, ${SET_SLOT} WHERE id = ?`).bind(item.price, item.slot, item.id, userId),
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
  await getUserRow(db, userId);
  if (itemId === null) {
    if (slot !== 'accessory') throw new ApiError(400, 'BAD_REQUEST', 'Зөвхөн нэмэлт эд зүйлийг тайлж болно');
    await db
      .prepare(`UPDATE users SET equipped = json_remove(CASE WHEN json_valid(equipped) THEN equipped ELSE '{}' END, '$.accessory') WHERE id = ?`)
      .bind(userId)
      .run();
  } else {
    const item = (await getCatalog(db)).get(itemId);
    if (!item || item.slot !== slot) throw new ApiError(400, 'BAD_REQUEST', 'Эд зүйл буруу');
    if (item.price > 0 && !(await ownedIds(db, userId)).has(item.id)) throw new ApiError(403, 'NOT_OWNED', 'Эхлээд авна уу');
    await db.prepare(`UPDATE users SET ${SET_SLOT} WHERE id = ?`).bind(slot, item.id, userId).run();
  }
  return loadMe(db, userId);
}

async function ownedCosmeticIds(db: D1Database, userId: number): Promise<Set<string>> {
  const { results } = await db
    .prepare('SELECT cosmetic_id FROM user_cosmetics WHERE user_id = ?')
    .bind(userId)
    .all<{ cosmetic_id: string }>();
  return new Set(results.map((r) => r.cosmetic_id));
}

export async function cosmeticsView(db: D1Database, userId: number): Promise<CosmeticsResponse> {
  const [me, owned] = await Promise.all([loadMe(db, userId), ownedCosmeticIds(db, userId)]);
  return {
    items: COSMETICS.map((c) => ({ id: c.id, kind: c.kind, key: c.key, price: c.price, owned: c.price === 0 || owned.has(c.id) })),
    me,
  };
}

/** Дэвсгэр / хувцас авна (нэг batch: эзэмшил, оноо, ledger). Өмсөх сонголт нь төхөөрөмж дээр. */
export async function buyCosmetic(db: D1Database, userId: number, cosmeticId: string, now = Date.now()): Promise<CosmeticsResponse> {
  const c = cosmeticById(cosmeticId);
  if (!c) throw new ApiError(404, 'NOT_FOUND', 'Олдсонгүй');
  if (c.price === 0) throw new ApiError(409, 'ALREADY_OWNED', 'Үнэгүй');
  await getUserRow(db, userId);
  try {
    await db.batch([
      db.prepare('INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_at) VALUES (?, ?, ?)').bind(userId, c.id, now),
      db.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(c.price, userId),
      db
        .prepare(`INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, 'cosmetic_buy', 'cosmetic', ?, ?)`)
        .bind(userId, -c.price, c.id, now),
    ]);
  } catch (e) {
    if (isConstraintError(e, 'UNIQUE')) throw new ApiError(409, 'ALREADY_OWNED', 'Аль хэдийн авсан');
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Оноо хүрэлцэхгүй');
    throw e;
  }
  return cosmeticsView(db, userId);
}
