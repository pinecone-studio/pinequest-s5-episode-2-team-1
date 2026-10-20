import type { AvatarLook, Equipped, ItemStyle, Slot } from '../../../shared/types';

export interface CatalogItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  minLevel: number;
  style: ItemStyle;
  sort: number;
}

interface ItemRow {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  min_level: number;
  style: string;
  sort: number;
}

// Эд зүйлс ажиллах явцад өөрчлөгдөхгүй тул isolate бүрт нэг удаа уншина.
let cache: Map<string, CatalogItem> | null = null;

export async function getCatalog(db: D1Database): Promise<Map<string, CatalogItem>> {
  if (cache) return cache;
  const { results } = await db
    .prepare('SELECT id, slot, name, price, min_level, style, sort FROM items ORDER BY sort')
    .all<ItemRow>();
  const map = new Map<string, CatalogItem>(
    results.map((r) => [
      r.id,
      { id: r.id, slot: r.slot, name: r.name, price: r.price, minLevel: r.min_level, style: JSON.parse(r.style), sort: r.sort },
    ]),
  );
  if (map.size > 0) cache = map;
  return map;
}

export function parseEquipped(json: string | null | undefined): Equipped {
  try {
    const v: unknown = JSON.parse(json ?? '{}');
    return v && typeof v === 'object' ? (v as Equipped) : {};
  } catch {
    return {};
  }
}

/** Өмссөн item id-уудыг клиентийн зурах style болгоно. */
export function avatarLook(equipped: Equipped, catalog: Map<string, CatalogItem>): AvatarLook {
  const look: AvatarLook = {};
  for (const [slot, id] of Object.entries(equipped) as [Slot, string | undefined][]) {
    const item = id ? catalog.get(id) : undefined;
    if (item && item.slot === slot) look[slot] = item.style;
  }
  return look;
}
