import type { LootKind } from '@shared/loot';
import type { SpriteKey } from '@/sprites';

/** Шагналын зураг: жагсаалт, товчинд жижиг (1×), нээх дэлгэцэнд том (4×, зоос 8×). */
export const LOOT_ICON: Record<LootKind, SpriteKey> = { amber: 'item_amber_15x30', honey: 'item_honey_30x30', bell: 'item_bell_27x30', coins: 'icon_coin_24x24' };
export const LOOT_ART: Record<LootKind, SpriteKey> = { amber: 'item_amber_60x120', honey: 'item_honey_120x120', bell: 'item_bell_108x120', coins: 'icon_coin_96x96' };
