import { currentNode as nodeAt, gateNodes, gateOf, isBossNode, pathLessons, unitOf, UNITS } from '@shared/path';
import type { BookLesson, Subject, SubjectPath } from '@shared/types';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import golems from './golems.json';
import world from './world.json';

// Адал явдлын газрын зураг: DESIGN.md §8-04-ийн бүлгийг доороос дээш 3 бүлэг (ой → тал → мөсөн уул) болгосон.
// Зангилааны байрлал ба дэвсгэр зураг хоёулаа docs/design/pixel-bear/tools/mapgen_world.py-аас үүснэ.
// Зангилаа бүр сурах бичгийн нэг хичээл (GET /me/lessons/:subject; ном байхгүй бол доорх TITLES), бүлэг бүрийн төгсгөлд
// boss: замын урт хичээлийн тооноос (shared/path.ts, сервертэй нэг эх). `n` = замын хичээлийн тоо (pathLessons).

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
export const UNIT_COUNT = UNITS;
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

export { gateOf, isBossNode, pathLessons, unitOf };

export interface PathUnit {
  /** бүлгийн эхний зангилаа, нахиа, бэлэг, хэцүү сорил, boss */
  start: number;
  sapling: number;
  gift: number;
  myst: number;
  boss: number;
  /** 0-р бүлгийн хуучин 390×760 газрын зурагтай харьцуулсан бүлгийн шилжилт: декорын байрлал бүлэг бүрт адил */
  top: number;
}

export interface PathLayout {
  /** замын хичээлийн тоо */
  n: number;
  nodes: PathNode[];
  /** Баавгайн алхах зам: зангилаа + гүүр чулуу, доороос дээш */
  trail: TrailPoint[];
  units: PathUnit[];
  /** тулааны хаалганы зангилаа (BOSSES ижил дараалалтай) */
  gates: number[];
  /** газрын зургийн босоо сунгалт (≥ 1) ба өндөр (dp) */
  scale: number;
  height: number;
}

/** world.json-ийн бүлэг бүрийн 16 цэгтэй зам (mapgen_world.py мод тарихгүй орхидог), гүүр чулуутай. */
const BASE: TrailPoint[] = world.trail;
const BASE_UNIT = world.unitSize;

/** world.json-ийн зиг-заг (mapgen_world.py): хөрш зангилаа хэвтээгээр 84 dp зайтай тул давхцахгүй. */
const ZIGZAG = [112, 196, 280, 196];

/**
 * Бүлгийн `k`-р алхмын x (0 = бүлгийн эхлэл, `m` = boss). Анхны зураг шиг: бүлэг 112-оос эхэлж зиг-загаар өгсөнө,
 * boss-ын өмнөх 3 алхам үргэлж 196 (зүүн гар) → 280 (баруун гар) → 196 (boss) — гарын дүрс зангилааныхаа зүүн, баруун
 * талд (GateFigure) замаас гадна зогсоно. Хоорондох алхам 196 болох бол (дараалсан хоёр нь нэг баганад) өмнөхийнхөө
 * эсрэг тал руу шилжинэ: хөрш хоёр зангилаа хэзээ ч нэг баганад биш, нэг баганын хоёр зангилаа дор хаяж 2 алхам зайтай.
 */
function zigzagX(k: number, m: number): number {
  if (k >= m - 2) return k === m - 1 ? 280 : 196;
  const x = ZIGZAG[k % 4];
  if (k === m - 3 && x === 196) return ZIGZAG[(k - 1) % 4] === 112 ? 280 : 112;
  return x;
}
/**
 * Хоёр зангилааны хоорондох хамгийн бага босоо зай (dp). Зиг-загийн оройн хоёр талын зангилаа ижил x-тэй, хоёр алхмын
 * зайтай: 2 · 28 = 56 ≥ дарах талбай (56), чулуу + од (−14…+32 = 46). Хичээл олон бол газрын зураг уртасна.
 */
const MIN_STEP = 28;
/** Boss-ын арал (72×54) том тул түүний доорх ижил баганын зангилаанаас нэмэлт зай (dp). */
const BOSS_GAP = 8;
/**
 * Boss-ын дүрс (≤ 86 dp) ба "BOSS" шошго (22 dp) арлаасаа дээш ~110 dp эзэлнэ: дараагийн бүлгийн эхний зангилаа
 * (дарах талбайн доод зах +32) түүнээс дээгүүр эхэлнэ.
 */
const BOSS_CLEAR = 142;

/**
 * `n` хичээлтэй замын газрын зураг: бүлэг бүрийн хичээлүүдийг world.json-ийн зиг-загаар тэнцүү босоо алхмаар
 * байрлуулна, boss нь бүлгийн замын оройд. Алхам MIN_STEP-ээс бага болох бол газрын зургийг (дэвсгэрийг оролцуулаад)
 * босоо чиглэлд сунгана: зангилаа, од, дарах талбай хэзээ ч давхцахгүй. Нахиа, бэлэг, хэцүү сорил нь бүлгийн ижил
 * хэсэгт (16 зангилаатай анхны зургийн 3, 9, 12).
 */
export function pathLayout(n: number): PathLayout {
  const gates = gateNodes(n);
  const bosses = [0, 3, 4].map((g) => gates[g]);
  const steps = bosses.map((boss, u) => boss - (u === 0 ? 0 : bosses[u - 1] + 1));
  const bases = Array.from({ length: UNIT_COUNT }, (_, u) => BASE.filter((t) => t.i !== undefined && Math.floor(t.i / BASE_UNIT) === u));
  const span = (u: number) => bases[u][0].y - bases[u][BASE_UNIT - 1].y;
  /** өмнөх бүлгийн boss ба энэ бүлгийн эхлэлийн хоорондох зай (world.json-д) */
  const gap = (u: number) => (u === 0 ? Infinity : bases[u - 1][BASE_UNIT - 1].y - bases[u][0].y);
  // Бүлэг бүрт алхам ≥ MIN_STEP, өмнөх boss-ын дээр BOSS_CLEAR байх хамгийн бага сунгалт
  const need = (u: number) => {
    const len = steps[u] * MIN_STEP + BOSS_GAP;
    const s = len / span(u);
    return s * gap(u) >= BOSS_CLEAR ? s : (len + BOSS_CLEAR) / (span(u) + gap(u));
  };
  const scale = Math.max(1, ...steps.map((_, u) => need(u)));
  const sy = (y: number) => Math.round(y * scale);
  const nodes: PathNode[] = [];
  const trail: TrailPoint[] = [];
  const units: PathUnit[] = [];
  for (let u = 0; u < UNIT_COUNT; u++) {
    const boss = bosses[u];
    const start = u === 0 ? 0 : bosses[u - 1] + 1;
    const m = steps[u];
    const at = (f: number) => start + Math.min(m - 1, Math.round(f * m));
    const unit = { start, sapling: at(3 / 15), gift: at(9 / 15), myst: at(12 / 15), boss, top: sy(bases[u][0].y - BASE[0].y) };
    units.push(unit);
    const kind = (i: number): NodeKind =>
      i === boss ? 'boss' : i === unit.myst ? 'myst' : i === unit.gift ? 'gift' : i === unit.sapling ? 'sapling' : 'stone';
    // бүлэг хоорондын гүүр чулуу
    if (u > 0) {
      const bridge = BASE.slice(BASE.findIndex((t) => t.i === u * BASE_UNIT - 1) + 1, BASE.findIndex((t) => t.i === u * BASE_UNIT));
      trail.push(...bridge.map((t) => ({ x: t.x, y: sy(t.y) })));
    }
    const y0 = u === 0 ? sy(bases[u][0].y) : Math.min(sy(bases[u][0].y), nodes[nodes.length - 1].y - BOSS_CLEAR);
    const step = (y0 - sy(bases[u][BASE_UNIT - 1].y) - BOSS_GAP) / Math.max(1, m);
    for (let k = 0; k <= m; k++) {
      const p = { x: zigzagX(k, m), y: Math.round(y0 - k * step - (k === m ? BOSS_GAP : 0)) };
      nodes.push({ i: start + k, ...p, kind: kind(start + k) });
      trail.push({ ...p, i: start + k });
    }
  }
  return { n, nodes, trail, units, gates, scale, height: sy(MAP_H) };
}

/**
 * Хичээлийн сурах зам дээрх одоогийн зангилаа = тэр хичээлийн шат − 1, гэхдээ давж амжаагүй хаалганы (boss, түүний
 * зүүн/баруун гар) дэргэд зогсоно, давсан хаалганаас өмнө буцахгүй. `bossesBeaten` = давсан хаалганы тоо.
 */
export const currentNode = (n: number, path: Pick<SubjectPath, 'level' | 'bossesBeaten'>) => nodeAt(n, path.level, path.bossesBeaten);

/** Энэ зангилаанд давж амжаагүй хаалга хүлээж байна уу (тэгвэл даалгавар нь тулаан). */
export const bossAhead = (n: number, i: number, bossesBeaten: number) => gateOf(n, i) >= bossesBeaten;

export const statusOf = (i: number, current: number): NodeStatus => (i < current ? 'done' : i === current ? 'current' : 'lock');

export const trailIndex = (layout: PathLayout, i: number) => layout.trail.findIndex((t) => t.i === i);

/** `from` зангилаанаас `to` хүртэл алхах цэгүүд (`from` өөрөө ороогүй). */
export const walkPoints = (layout: PathLayout, from: number, to: number) =>
  layout.trail.slice(trailIndex(layout, from) + 1, trailIndex(layout, to) + 1);

/** Алхмын төлөв: дууссан = ногоон ✓, одоогийн = шар хүрээтэй тод, түгжээтэй = бүдэг саарал + цоож; boss = 1.5× том арал. */
export function tileFor(node: PathNode, status: NodeStatus): SpriteKey {
  if (node.kind === 'boss') return status === 'done' ? 'tile_pedestal_sapling_72x54' : 'tile_pedestal_end_72x54';
  return status === 'done' ? 'tile_stone_done_48x36' : status === 'current' ? 'tile_step_cur_56x44' : 'tile_step_lock_48x36';
}

/** Зангилааны номын хичээл (boss эсвэл номгүй бол null). */
export function lessonAt(lessons: readonly BookLesson[], i: number): BookLesson | null {
  const n = lessons.length;
  if (pathLessons(n) !== n || isBossNode(n, i)) return null;
  return lessons[i - unitOf(n, i)] ?? null;
}

// Ном байхгүй үед: бүлэг бүрт 8 сэдэв, сэдэв бүр нэг зангилаа (shared/path.ts DEFAULT_LESSONS)
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
  const n = pathLessons(lessons.length);
  const g = gateOf(n, i);
  if (g >= 0) return isBossNode(n, i) ? S.path.boss(BOSSES[g].name) : S.path.guard(BOSSES[g].role === 'left', BOSSES[g].name);
  return lessonAt(lessons, i)?.title ?? TITLES[subject][i - unitOf(n, i)];
}
