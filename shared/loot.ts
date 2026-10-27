// Нууц хайрцгийн шагнал (API ба апп нэг эх). Боломж, жин, тоо хэмжээг зөвхөн энд өөрчилнө.

/** Цүнхэнд хадгалагдаж, ашиглахад зарцуулагдах хэрэглэгдэхүүн. */
export const BAG_ITEMS = ['amber', 'honey', 'bell'] as const;
export type BagItem = (typeof BAG_ITEMS)[number];
/** Хар Цасан өвгөнийг (10-р хаалга) анх ялахад олгох хэрэглэгдэхүүн. */
export const GATE_ITEM: Partial<Record<number, BagItem>> = { 10: 'bell' };
/** Хайрцгаас гарах шагнал: цүнхний хэрэглэгдэхүүн эсвэл шууд оноо (coin). */
export type LootKind = BagItem | 'coins';

export interface LootEntry {
  kind: LootKind;
  /** харьцангуй жин: 45 / (45+35+20) = 45% */
  weight: number;
  qty: number;
}

/**
 * amber «Хувын болор»: тулаанд нэг асуултын 2 буруу хариултыг арилгана.
 * honey «Зөгийн балны сав»: нэг амь (зүрх) нөхнө.
 * coins: шууд оноо болно (цүнхэнд орохгүй).
 */
export const CHEST_LOOT: readonly LootEntry[] = [
  { kind: 'amber', weight: 45, qty: 2 },
  { kind: 'honey', weight: 35, qty: 1 },
  { kind: 'coins', weight: 20, qty: 30 },
];

/** `r` ∈ [0, 1) санамсаргүй тоогоор жинтэй сонголт. */
export function rollLoot(r: number, table: readonly LootEntry[] = CHEST_LOOT): LootEntry {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let x = r * total;
  for (const e of table) {
    if (x < e.weight) return e;
    x -= e.weight;
  }
  return table[table.length - 1];
}
