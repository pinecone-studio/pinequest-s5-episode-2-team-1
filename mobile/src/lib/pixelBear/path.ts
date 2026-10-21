import type { Me, Subject } from '@shared/types';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import world from './world.json';

// Адал явдлын газрын зураг: DESIGN.md §8-04-ийн бүлгийг доороос дээш 3 бүлэг (ой → тал → мөсөн уул) болгосон.
// Зангилааны байрлал ба дэвсгэр зураг хоёулаа docs/design/pixel-bear/tools/mapgen_world.py-аас үүснэ.
// Backend-д хичээлийн бүтэц байхгүй тул түвшин (Шат) бүрийг нэг зангилаа гэж үзнэ; бүлэг бүрийн төгсгөлд boss.

export type NodeKind = 'stone' | 'sapling' | 'gift' | 'myst' | 'boss';
export type NodeStatus = 'done' | 'current' | 'lock';

export interface TrailPoint {
  x: number;
  y: number;
  /** түвшний зангилааны дугаар; бүлэг хоорондын гүүр чулуунд байхгүй */
  i?: number;
}

export interface PathNode {
  i: number;
  kind: NodeKind;
  /** зангилааны дээд хавтгайн төв (газрын зураг дээрх dp) */
  x: number;
  y: number;
}

export const MAP_W = world.width;
export const MAP_H = world.height;
export const UNIT_SIZE = world.unitSize;
export const UNIT_COUNT = world.units;
/** Баавгайн алхах зам: зангилаа + гүүр чулуу, доороос дээш */
export const TRAIL: TrailPoint[] = world.trail;
/** Дэвсгэрийн хэсгүүд, дээрээс доош */
export const MAP_PIECES = ['map_world_2_390x448', 'map_world_1_390x760', 'map_world_0_390x760'] as const satisfies readonly SpriteKey[];

export interface Boss {
  name: string;
  /** газрын зураг (2×) ба тулааны (4×) дүрс; `frames` > 1 бол BOSS_FRAME-ийн дараалалтай хэвтээ sheet */
  map: SpriteKey;
  battle: SpriteKey;
  frames: number;
  /** агаарт хөвдөг (сүүдэртэй) эсвэл газар зогсдог */
  floats: boolean;
  /** дан зурагтай (frames = 1) boss-ын онох агшинд дээр нь анивчих цагаан дүрс */
  white?: SpriteKey;
  /** тулааны дэвсгэр: boss-ын гэр (430×464, самбарын доод талд) */
  lair: SpriteKey;
  /** давхиж цохихдоо барих зэвсэг: 3 frame (өргөсөн → дүүжлэх → цохих); left/top = battle frame дотор байрлах цэг (dp) */
  weapon?: { sheet: SpriteKey; left: number; top: number };
}
export const BOSSES: Boss[] = [
  { name: 'Хулуун шидтэн', map: 'boss_pumpkin_sheet_496x94', battle: 'boss_pumpkin_sheet_992x188', frames: 8, floats: true, lair: 'lair_0_430x464',
    // хадуурын барьцаа (20,32) нь нөмрөгийн урд талын гарт (24,30) таарна: 4× → (96−80, 120−128)
    weapon: { sheet: 'fx_scythe_576x240', left: 16, top: -8 } },
  { name: 'Талын мангас', map: 'map_boss_1_60x56', battle: 'map_boss_1_120x112', frames: 1, white: 'map_boss_1_white_120x112', floats: false, lair: 'lair_1_430x464' },
  { name: 'Мөсөн мангас', map: 'map_boss_2_60x56', battle: 'map_boss_2_120x112', frames: 1, white: 'map_boss_2_white_120x112', floats: false, lair: 'lair_2_430x464' },
];
/** Boss sheet-ийн frame-ууд (boss_pumpkin.py): хөвөх 0–2, ид шид, цочих, цагаан, давхих, цохих */
export const BOSS_FRAME = { cast: 3, hurt: 4, flash: 5, dash: 6, strike: 7 } as const;
/** Хөвөх давталт: 0 → 1 → 2 → 1 (pixel алхмаар дээш доош) */
export const HOVER = [0, 1, 2, 1];

const KIND_AT: Partial<Record<number, NodeKind>> = { 3: 'sapling', 9: 'gift', 12: 'myst', [UNIT_SIZE - 1]: 'boss' };
export const NODES: PathNode[] = TRAIL.flatMap((t) =>
  t.i === undefined ? [] : [{ i: t.i, x: t.x, y: t.y, kind: KIND_AT[t.i % UNIT_SIZE] ?? 'stone' }],
);
export const NODE_COUNT = NODES.length;

export const isPedestal = (n: PathNode) => n.kind !== 'stone';
export const unitOf = (i: number) => Math.floor(i / UNIT_SIZE);
export const isBossNode = (i: number) => i % UNIT_SIZE === UNIT_SIZE - 1;

/** Одоогийн зангилаа = түвшин − 1. shortcut: сүүлийн boss дээр зогсоно; 48-р шатнаас цааш бүлэг нэмэхэд газрын зургийг өргөтгөнө. */
export function currentNode(me: Pick<Me, 'level'>): number {
  return Math.max(0, Math.min(NODE_COUNT - 1, me.level - 1));
}

export const statusOf = (i: number, current: number): NodeStatus => (i < current ? 'done' : i === current ? 'current' : 'lock');

export const trailIndex = (i: number) => TRAIL.findIndex((t) => t.i === i);

/** `from` зангилаанаас `to` хүртэл алхах цэгүүд (`from` өөрөө ороогүй). */
export const walkPoints = (from: number, to: number) => TRAIL.slice(trailIndex(from) + 1, trailIndex(to) + 1);

export function tileFor(node: PathNode, status: NodeStatus): SpriteKey {
  if (node.kind === 'stone') return status === 'done' ? 'tile_stone_done_48x36' : 'tile_stone_lock_48x36';
  if (status === 'current') return 'tile_pedestal_cur_72x54';
  if (node.kind === 'gift') return 'tile_pedestal_gift_72x54';
  if (status === 'done') return 'tile_pedestal_sapling_72x54';
  return node.kind === 'boss' ? 'tile_pedestal_end_72x54' : 'tile_pedestal_myst_72x54';
}

// Бүлэг бүрт 8 сэдэв, сэдэв бүр 2 зангилаа (boss-ыг тооцохгүй)
const TITLES: Record<Subject, string[]> = {
  math: [
    'Бутархай тоо', 'Бутархай нэмэх', 'Бутархай хасах', 'Аравтын бутархай', 'Харьцаа', 'Хувь', 'Тэгшитгэл', 'Геометр',
    'Бүхэл тоо', 'Сөрөг тоо', 'Зэрэг', 'Язгуур', 'Илэрхийлэл', 'Шугаман тэгшитгэл', 'Тэнцэтгэл биш', 'Функц',
    'Гурвалжин', 'Пифагорын теорем', 'Тойрог', 'Талбай', 'Эзэлхүүн', 'Координат', 'Магадлал', 'Статистик',
  ],
  mongolian: [
    'Дуу авиа', 'Үгийн сан', 'Үйл үг', 'Нэр үг', 'Зүйр цэцэн үг', 'Өгүүлбэр', 'Найруулга', 'Уншлага',
    'Нийлмэл өгүүлбэр', 'Холбоос үг', 'Дагавар', 'Нөхцөл', 'Цэг тэмдэг', 'Хэлц үг', 'Захидал', 'Ярилцлага',
    'Үлгэр', 'Шүлэг', 'Өгүүллэг', 'Тууль', 'Домог', 'Эсээ', 'Илтгэл', 'Уран зохиол',
  ],
  physics: [
    'Хөдөлгөөн', 'Хурд', 'Хүч', 'Даралт', 'Эрчим хүч', 'Дулаан', 'Гэрэл', 'Цахилгаан',
    'Масс', 'Нягт', 'Архимедын хүч', 'Механик ажил', 'Чадал', 'Энгийн механизм', 'Хэлбэлзэл', 'Дуу авиа',
    'Цахилгаан гүйдэл', 'Хүчдэл', 'Эсэргүүцэл', 'Соронзон', 'Толь', 'Линз', 'Атом', 'Цөмийн физик',
  ],
};

export function lessonTitle(subject: Subject, i: number): string {
  if (isBossNode(i)) return S.path.boss(BOSSES[unitOf(i)].name);
  return TITLES[subject][unitOf(i) * 8 + Math.floor((i % UNIT_SIZE) / 2)];
}
