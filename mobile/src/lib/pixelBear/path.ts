import type { Me, Subject } from '@shared/types';
import type { SpriteKey } from '@/sprites';

// Сурах замын газрын зураг (DESIGN.md §8-04). Backend-д хичээл/зангилааны бүтэц байхгүй тул
// зангилааны байрлалыг газрын зургийн хүснэгтээс, ахицыг хэрэглэгчийн XP-ээс гаргана (mock).

export type NodeKind = 'stone' | 'sapling' | 'gift' | 'myst' | 'end';
export type NodeStatus = 'done' | 'current' | 'lock';

export interface PathNode {
  i: number;
  kind: NodeKind;
  /** зангилааны дээд хавтгайн төв (газрын зураг дээрх dp) */
  x: number;
  y: number;
}

/** DESIGN.md §8-04-ийн хүснэгт. */
export const NODES: PathNode[] = [
  { i: 0, kind: 'stone', x: 140, y: 684 },
  { i: 1, kind: 'stone', x: 180, y: 656 },
  { i: 2, kind: 'stone', x: 220, y: 628 },
  { i: 3, kind: 'sapling', x: 272, y: 590 },
  { i: 4, kind: 'stone', x: 220, y: 552 },
  { i: 5, kind: 'stone', x: 180, y: 524 },
  { i: 6, kind: 'stone', x: 128, y: 486 },
  { i: 7, kind: 'stone', x: 180, y: 448 },
  { i: 8, kind: 'stone', x: 220, y: 420 },
  { i: 9, kind: 'gift', x: 272, y: 382 },
  { i: 10, kind: 'stone', x: 220, y: 344 },
  { i: 11, kind: 'stone', x: 180, y: 316 },
  { i: 12, kind: 'myst', x: 128, y: 278 },
  { i: 13, kind: 'stone', x: 180, y: 240 },
  { i: 14, kind: 'stone', x: 220, y: 212 },
  { i: 15, kind: 'end', x: 272, y: 174 },
];
export const NODE_COUNT = NODES.length;
export const MAP_W = 390;
export const MAP_H = 760;
/** Нэг зангилаа ахихад шаардагдах XP (нэг даалгавар ≈ 20–50 XP) */
export const XP_PER_NODE = 25;

export const isPedestal = (n: PathNode) => n.kind !== 'stone';

/** Одоогийн зангилаа = XP-ээс. 15 дээр (төгсгөл) зогсоно. */
export function currentNode(me: Pick<Me, 'xp'>): number {
  return Math.max(0, Math.min(NODE_COUNT - 1, Math.floor(me.xp / XP_PER_NODE)));
}

export const statusOf = (i: number, current: number): NodeStatus => (i < current ? 'done' : i === current ? 'current' : 'lock');

export function tileFor(node: PathNode, status: NodeStatus): SpriteKey {
  if (node.kind === 'stone') return status === 'done' ? 'tile_stone_done_48x36' : 'tile_stone_lock_48x36';
  if (status === 'current') return 'tile_pedestal_cur_72x54';
  if (node.kind === 'gift') return 'tile_pedestal_gift_72x54';
  if (status === 'done') return 'tile_pedestal_sapling_72x54';
  return node.kind === 'end' ? 'tile_pedestal_end_72x54' : 'tile_pedestal_myst_72x54';
}

const TITLES: Record<Subject, string[]> = {
  math: ['Бутархай тоо', 'Бутархай нэмэх', 'Бутархай хасах', 'Аравтын бутархай', 'Харьцаа', 'Хувь', 'Тэгшитгэл', 'Геометр'],
  mongolian: ['Дуу авиа', 'Үгийн сан', 'Үйл үг', 'Нэр үг', 'Зүйр цэцэн үг', 'Өгүүлбэр', 'Найруулга', 'Уншлага'],
  physics: ['Хөдөлгөөн', 'Хурд', 'Хүч', 'Даралт', 'Эрчим хүч', 'Дулаан', 'Гэрэл', 'Цахилгаан'],
};

export function lessonTitle(subject: Subject, i: number): string {
  const list = TITLES[subject];
  return list[Math.floor(i / 2) % list.length];
}
