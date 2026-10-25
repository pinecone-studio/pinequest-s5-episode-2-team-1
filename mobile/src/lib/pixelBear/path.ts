import { GATES } from '@shared/gates';
import type { BookLesson, Subject, SubjectPath } from '@shared/types';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import golems from './golems.json';
import world from './world.json';

// Адал явдлын газрын зураг: DESIGN.md §8-04-ийн бүлгийг доороос дээш 3 бүлэг (ой → тал → мөсөн уул) болгосон.
// Зангилааны байрлал ба дэвсгэр зураг хоёулаа docs/design/pixel-bear/tools/mapgen_world.py-аас үүснэ.
// Түвшин (Шат) бүр нэг зангилаа, бүлэг бүрийн төгсгөлд boss. Зангилааны сэдэв нь сурах бичгийн гарчгаас
// (GET /me/lessons/:subject); ном байхгүй бол доорх TITLES.

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
  /** газрын зураг ба тулааны дүрс; `frames` > 1 бол sheet (Хулуун шидтэн: BOSS_FRAME-ийн дараалал, PixelLab дайсан: golems.json) */
  map: SpriteKey;
  battle: SpriteKey;
  frames: number;
  /** grid sheet-ийн баганын тоо (өгөөгүй бол нэг мөр) */
  cols?: number;
  /** PixelLab-аар хөдөлгөсөн дайсан (golems.json-ийн түлхүүр): idle / attack / hurt tag-тай */
  anim?: keyof typeof golems;
  /** 2-р бүлгийн boss-ын зүүн / баруун гар (газрын зураг дээр зангилааны хажууд) */
  role?: 'left' | 'right';
  /** холоос довтлох сум ба баавгайд онох оч (PixelLab vfx) */
  shot?: { id: SpriteKey; frames: number; cols: number };
  impact?: { id: SpriteKey; frames: number; cols: number };
  /** агаарт хөвдөг (сүүдэртэй) эсвэл газар зогсдог */
  floats: boolean;
  /** дан зурагтай (frames = 1) boss-ын онох агшинд дээр нь анивчих цагаан дүрс */
  white?: SpriteKey;
  /** тулааны дэвсгэр: boss-ын гэр (430×464, самбарын доод талд) */
  lair: SpriteKey;
  /** давхиж цохихдоо барих зэвсэг: 3 frame (өргөсөн → дүүжлэх → цохих); left/top = battle frame дотор байрлах цэг (dp) */
  weapon?: { sheet: SpriteKey; left: number; top: number };
}
/** PixelLab-аар хөдөлгөсөн 2-р бүлгийн дайсан: sheet газрын зураг дээр 1×, тулаанд 2× (boss 2.5×) */
const golem = (anim: keyof typeof golems, map: SpriteKey, battle: SpriteKey, lair: SpriteKey) => ({
  anim,
  map,
  battle,
  frames: golems[anim].frames.length,
  cols: golems[anim].columns,
  floats: false,
  lair,
  impact: { id: 'fx_golem_impact_192x128' as const, frames: 4, cols: 3 },
});
/** Тулааны хаалганы дараалал (GATES-тэй ижил): 1-р boss, 2-р бүлгийн зүүн гар, баруун гар, boss, 3-р boss */
export const BOSSES: Boss[] = [
  { name: 'Хулуун шидтэн', map: 'boss_pumpkin_sheet_376x71', battle: 'boss_pumpkin_sheet_992x188', frames: 8, floats: true, lair: 'lair_0_430x464',
    // хадуурын барьцаа (20,32) нь нөмрөгийн урд талын гарт (24,30) таарна: 4× → (96−80, 120−128)
    weapon: { sheet: 'fx_scythe_576x240', left: 16, top: -8 } },
  { name: 'Сарны хамгаалагч', role: 'left', ...golem('left', 'golem_left_sheet_456x234', 'golem_left_sheet_912x468', 'lair_1_left_430x464'),
    shot: { id: 'fx_moon_crescent_144x96', frames: 6, cols: 3 } },
  { name: 'Болор шидтэн', role: 'right', ...golem('right', 'golem_right_sheet_492x252', 'golem_right_sheet_984x504', 'lair_1_right_430x464'),
    shot: { id: 'fx_crystal_bolt_144x144', frames: 8, cols: 3 } },
  { name: 'Хадан аварга', ...golem('boss', 'golem_boss_sheet_516x258', 'golem_boss_sheet_1290x645', 'lair_1_430x464'),
    shot: { id: 'fx_golem_orb_144x144', frames: 8, cols: 3 } },
  { name: 'Мөсөн мангас', map: 'map_boss_2_75x70', battle: 'map_boss_2_120x112', frames: 1, white: 'map_boss_2_white_120x112', floats: false, lair: 'lair_2_430x464' },
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

export const unitOf = (i: number) => Math.floor(i / UNIT_SIZE);
/** Бүлгийн сүүлийн зангилаа: жинхэнэ boss (1.5× арал) */
export const isBossNode = (i: number) => i % UNIT_SIZE === UNIT_SIZE - 1;

/** Дарааллаар давах тулааны зангилаа (shared/gates.ts, сервертэй нэг эх); BOSSES ижил дараалалтай */
export { GATES };
/** Зангилааны хаалганы дугаар (BOSSES-ийн индекс), хаалга биш бол −1 */
export const gateOf = (i: number) => (GATES as readonly number[]).indexOf(i);

/**
 * Хичээлийн сурах зам дээрх одоогийн зангилаа = тэр хичээлийн шат − 1, гэхдээ давж амжаагүй хаалганы (boss, түүний
 * зүүн/баруун гар) дэргэд зогсоно (XP-ээр ахисан ч ялж байж цааш явна). `bossesBeaten` = давсан хаалганы тоо.
 * shortcut: сүүлийн boss дээр зогсоно; 48-р шатнаас цааш бүлэг нэмэхэд газрын зургийг өргөтгөнө.
 */
export function currentNode(path: Pick<SubjectPath, 'level' | 'bossesBeaten'>): number {
  const gate = path.bossesBeaten < GATES.length ? GATES[path.bossesBeaten] : NODE_COUNT - 1;
  return Math.max(0, Math.min(NODE_COUNT - 1, gate, path.level - 1));
}

/** Энэ зангилаанд давж амжаагүй хаалга хүлээж байна уу (тэгвэл даалгавар нь тулаан). */
export const bossAhead = (i: number, bossesBeaten: number) => gateOf(i) >= bossesBeaten;

export const statusOf = (i: number, current: number): NodeStatus => (i < current ? 'done' : i === current ? 'current' : 'lock');

export const trailIndex = (i: number) => TRAIL.findIndex((t) => t.i === i);

/** `from` зангилаанаас `to` хүртэл алхах цэгүүд (`from` өөрөө ороогүй). */
export const walkPoints = (from: number, to: number) => TRAIL.slice(trailIndex(from) + 1, trailIndex(to) + 1);

/** Алхмын төлөв: дууссан = ногоон ✓, одоогийн = шар хүрээтэй тод, түгжээтэй = бүдэг саарал + цоож; boss = 1.5× том арал. */
export function tileFor(node: PathNode, status: NodeStatus): SpriteKey {
  if (node.kind === 'boss') return status === 'done' ? 'tile_pedestal_sapling_72x54' : 'tile_pedestal_end_72x54';
  return status === 'done' ? 'tile_stone_done_48x36' : status === 'current' ? 'tile_step_cur_56x44' : 'tile_step_lock_48x36';
}

/** Boss-гүй зангилааны тоо: номын бүх хичээл эдгээрт жигд тарна. */
const LESSON_NODES = NODE_COUNT - UNIT_COUNT;

/**
 * Зангилаанд ногдох номын хичээлүүд. Номын хичээлүүдийг boss-гүй зангилаанд дарааллаар нь жигд тараана:
 * сүүлийн зангилаа = номын сүүлийн хичээл, дараа нь сүүлийн boss (ялбал ном дууссан). Хичээл цөөн бол нэг
 * хичээл хэд хэдэн зангилаа эзэлнэ, олон бол нэг зангилаанд хоёр хичээл орно.
 * Сервер (api/src/domain/path.ts) даалгаврын асуултыг ижил тооцоогоор сонгодог: өөрчилбөл хоёуланг нь.
 */
export function lessonsAt(lessons: readonly BookLesson[], i: number): BookLesson[] {
  if (lessons.length === 0 || isBossNode(i)) return [];
  const k = i - unitOf(i);
  const from = Math.floor((k * lessons.length) / LESSON_NODES);
  const to = Math.max(from + 1, Math.floor(((k + 1) * lessons.length) / LESSON_NODES));
  return lessons.slice(from, to);
}

// Ном байхгүй үед: бүлэг бүрт 8 сэдэв, сэдэв бүр 2 зангилаа (boss-ыг тооцохгүй)
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

export function lessonTitle(subject: Subject, i: number, lessons: readonly BookLesson[] = []): string {
  const g = gateOf(i);
  if (g >= 0) return isBossNode(i) ? S.path.boss(BOSSES[g].name) : S.path.guard(BOSSES[g].role === 'left', BOSSES[g].name);
  const book = lessonsAt(lessons, i);
  if (book.length) return book.map((l) => l.title).join(' · ');
  return TITLES[subject][unitOf(i) * 8 + Math.floor((i % UNIT_SIZE) / 2)];
}
