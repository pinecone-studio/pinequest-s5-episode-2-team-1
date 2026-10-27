import { chestNodes, currentNode as nodeAt, gateNodes, gateOf, isBossNode, pathLessons, UNIT_GATE, unitOf, UNITS } from '@shared/path';
import type { BookLesson, Subject, SubjectPath } from '@shared/types';
import type { DefeatKey } from '@/components/DefeatAnim';
import type { ThemeId } from '@/constants/chapterTheme';
import { S } from '@/i18n/strings';
import { type SpriteKey, sprites } from '@/sprites';
import golems from './golems.json';
import world from './world.json';

// Адал явдлын газрын зураг: DESIGN.md §8-04-ийн бүлгийг 3 бүлэг болгосон; Duolingo шиг дээрээс доош явна
// (хулууны ой → чулуун балгас, гол → цасан уул). Бүлэг бүр өөрийн дэвсгэр зураг дээр, зангилаанууд нь зигзаг.
// Зангилаа бүр сурах бичгийн нэг хичээл (GET /me/lessons/:subject; ном байхгүй бол доорх TITLES), бүлэг бүрийн төгсгөлд
// boss: замын урт хичээлийн тооноос (shared/path.ts, сервертэй нэг эх). `n` = замын хичээлийн тоо (pathLessons).

export type NodeKind = 'stone' | 'sapling' | 'gift' | 'myst' | 'chest' | 'boss';
export type NodeStatus = 'done' | 'current' | 'lock';

export interface TrailPoint {
  x: number;
  y: number;
  /** түвшний зангилааны дугаар */
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
export const UNIT_COUNT = UNITS;

export interface MapChapter {
  bg: SpriteKey;
  themeId: ThemeId;
  /** зургийн дээд талын энэ хэдэн мөрийг тайрна (өөр бүлэгтэй уусах зориулалттай шилжилт) */
  cropTop?: number;
  /** дэвсгэр богино бол доор нь зургийн энэ мөрөөс доошхи хэсгийг дахин тавьж уртасгана */
  extend?: number;
  /** зургийн зүүн, баруун захын энэ хэдэн багана гажигтай (үүсгэлтийн зурвас): хөрш багануудаар халхална */
  edgeFix?: number;
  /** бүлгийн доод хэсгийн тусдаа зураг (boss-ын тавцан): дэвсгэрийн доор залгана */
  foot?: SpriteKey;
}
/**
 * Бүлэг бүрийн дэвсгэр ба самбарын theme, дээрээс доош (UNIT_COUNT ширхэг, бүлгийн дарааллаар). Шинэ бүлэгт дэвсгэр,
 * themeId хоёрыг нэмэхэд хангалттай.
 */
export const MAP_CHAPTERS: readonly MapChapter[] = [
  { bg: 'map_world_0_390x760', themeId: 'halloween' },
  // дээд 112 мөр нь цасан бүлэгтэй уусах цайвар манан (зураг анх цасны доор байсан): энд хэрэггүй
  // хоёр захад 6 px босоо зурвас (PixelLab үүсгэлтийн үлдэгдэл)
  { bg: 'map_world_1_390x760', themeId: 'moonstone', cropTop: 112, edgeFix: 6 },
  // 3-р бүлэг: Нарны элсэн хаант улс (цэргүүд, нууц хайрцаг), доор нь Нарны арсланы тавцан
  { bg: 'map_world_sun_390x780', themeId: 'sunsands', foot: 'map_world_sun_foot_390x430' },
  // 4-р бүлэг: Мөнх цаст оргил (Мөсөн эвэрт хааны зүүн, баруун гар ба өөрөө)
  { bg: 'map_world_snow_390x780', themeId: 'eversnow' },
];
export const chapterHeight = (c: MapChapter) =>
  sprites[c.bg].height * (c.extend === undefined ? 1 : 2) - (c.extend ?? 0) - (c.cropTop ?? 0) + (c.foot ? sprites[c.foot].height : 0);
/** Бүлэг бүрийн дээд зах (газрын зураг дээрх dp) */
export const CHAPTER_TOPS = MAP_CHAPTERS.map((_, k) => MAP_CHAPTERS.slice(0, k).reduce((sum, c) => sum + chapterHeight(c), 0));
export const MAP_H = CHAPTER_TOPS[CHAPTER_TOPS.length - 1] + chapterHeight(MAP_CHAPTERS[MAP_CHAPTERS.length - 1]);

/** Газрын зургийн `y` цэг аль бүлгийн дэвсгэр дээр байгаа вэ (самбарын theme, дээд баннер). */
export function chapterAtY(y: number): number {
  let k = 0;
  while (k < CHAPTER_TOPS.length - 1 && y >= CHAPTER_TOPS[k + 1]) k++;
  return k;
}

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
  /** 3-р бүлгийн цэрэг: зангилааныхаа хажууд, замаас холдсон талд зогсоно */
  soldier?: boolean;
  /** 4-р бүлгийн Santa-ийн туслах: цэрэг шиг зангилааныхаа хажууд */
  helper?: boolean;
  /** холоос довтлох сум ба баавгайд онох оч (PixelLab vfx) */
  shot?: { id: SpriteKey; frames: number; cols: number };
  impact?: { id: SpriteKey; frames: number; cols: number };
  /** агаарт хөвдөг (сүүдэртэй) эсвэл газар зогсдог */
  floats: boolean;
  /** дан зурагтай (frames = 1) boss-ын онох агшинд дээр нь анивчих цагаан дүрс */
  white?: SpriteKey;
  /** тулааны дэвсгэр: boss-ын гэр (430×464, самбарын доод талд) */
  lair: SpriteKey;
  /** ялагдах анимаци (scripts/defeat-sprites.ts): тулааны frame-тэй ижил хэмжээтэй sheet */
  defeat?: { id: SpriteKey; k: DefeatKey };
  /** давхиж цохихдоо барих зэвсэг: 3 frame (өргөсөн → дүүжлэх → цохих); left/top = battle frame дотор байрлах цэг (dp) */
  weapon?: { sheet: SpriteKey; left: number; top: number };
}
/** PixelLab-аар хөдөлгөсөн 2-р бүлгийн дайсан: sheet газрын зураг дээр 1×, тулаанд 2× (boss 2.5×) */
const golem = (anim: keyof typeof golems, map: SpriteKey, battle: SpriteKey, lair: SpriteKey, defeat: SpriteKey) => ({
  anim,
  map,
  battle,
  frames: golems[anim].frames.length,
  cols: golems[anim].columns,
  floats: false,
  lair,
  defeat: { id: defeat, k: anim },
  impact: { id: 'fx_golem_impact_192x128' as const, frames: 4, cols: 3 },
});
/** Тулааны хаалганы дараалал (GATES-тэй ижил): 1-р boss, 2-р бүлгийн зүүн гар, баруун гар, boss, 3-р boss */
export const BOSSES: Boss[] = [
  { name: 'Хулуун шидтэн', map: 'boss_pumpkin_sheet_376x71', battle: 'boss_pumpkin_sheet_992x188', frames: 8, floats: true, lair: 'lair_0_430x464',
    // хадуурын барьцаа (20,32) нь нөмрөгийн урд талын гарт (24,30) таарна: 4× → (96−80, 120−128)
    weapon: { sheet: 'fx_scythe_576x240', left: 16, top: -8 },
    defeat: { id: 'defeat_pumpkin_1032x636', k: 'pumpkin' },
    // ногоон сүнсний гал шидэж, ногоон очоор онно
    shot: { id: 'fx_ghost_flame_144x144', frames: 8, cols: 3 },
    impact: { id: 'fx_ghost_hit_192x192', frames: 7, cols: 3 } },
  { name: 'Сарны хамгаалагч', role: 'left', ...golem('left', 'golem_left_sheet_456x234', 'golem_left_sheet_912x468', 'lair_1_left_430x464', 'defeat_left_1152x528'),
    shot: { id: 'fx_moon_crescent_144x96', frames: 6, cols: 3 }, impact: { id: 'fx_moon_hit_192x192', frames: 7, cols: 3 } },
  { name: 'Болор шидтэн', role: 'right', ...golem('right', 'golem_right_sheet_492x252', 'golem_right_sheet_984x504', 'lair_1_right_430x464', 'defeat_right_1224x564'),
    shot: { id: 'fx_crystal_bolt_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_crystal_strike_384x384', frames: 10, cols: 4 } },
  { name: 'Хадан аварга', ...golem('boss', 'golem_boss_sheet_516x258', 'golem_boss_sheet_1290x645', 'lair_1_430x464', 'defeat_boss_1590x720'),
    shot: { id: 'fx_golem_orb_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_crystal_blast_384x288', frames: 12, cols: 4 } },
  // 3-р бүлэг: цэрэг → ахлагч → boss улам хүнд (асуултын хүнд нь серверийн GATE_STAGE)
  // цох элсэн бөмбөг шидэж тоос босгоно; ахлагч алтан нарны диск; арслан нарны галт бөмбөг, том дэлбэрэлт
  { name: 'Элсэн цох', soldier: true, ...golem('scarab', 'golem_scarab_sheet_264x144', 'golem_scarab_sheet_528x288', 'lair_sun_scarab_430x464', 'defeat_scarab_768x348'),
    shot: { id: 'fx_sand_ball_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_sand_dust_256x192', frames: 10, cols: 4 } },
  { name: 'Бамбайт ахлагч', soldier: true, ...golem('captain', 'golem_captain_sheet_420x246', 'golem_captain_sheet_840x492', 'lair_sun_captain_430x464', 'defeat_captain_1080x552'),
    shot: { id: 'fx_sun_disc_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_gold_hit_192x192', frames: 7, cols: 3 } },
  { name: 'Нарны арслан', ...golem('lion', 'golem_lion_sheet_480x246', 'golem_lion_sheet_1200x615', 'lair_sun_430x464', 'defeat_lion_1500x690'),
    shot: { id: 'fx_sun_fireball_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_sun_blast_384x288', frames: 12, cols: 4 } },
  // 4-р бүлэг: ирвэс мөсөн сум, шар шувуу хүйтэн бөмбөгөөр аянга буулгана, Santa-ийн туслах сарлаг мөсөн бөмбөгөөр
  // бутлана, Santa улаан хараалын бөмбөг шиднэ
  { name: 'Мөсөн бамбайт ирвэс', role: 'left', ...golem('leopard', 'golem_leopard_sheet_420x228', 'golem_leopard_sheet_840x456', 'lair_snow_leopard_430x464', 'defeat_leopard_1080x516'),
    shot: { id: 'fx_ice_shard_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_ice_hit_192x192', frames: 7, cols: 3 } },
  { name: 'Шар шувуун шидтэн', role: 'right', ...golem('owl', 'golem_owl_sheet_420x216', 'golem_owl_sheet_840x432', 'lair_snow_owl_430x464', 'defeat_owl_1080x492'),
    shot: { id: 'fx_frost_orb_162x75', frames: 8, cols: 3 }, impact: { id: 'fx_frost_strike_384x384', frames: 10, cols: 4 } },
  { name: 'Мөсөн эвэрт хаан', helper: true, ...golem('yak', 'golem_yak_sheet_444x192', 'golem_yak_sheet_1110x480', 'lair_snow_yak_430x464', 'defeat_yak_1410x555'),
    shot: { id: 'fx_glacier_orb_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_glacier_blast_416x408', frames: 10, cols: 4 } },
  { name: 'Хар Цасан өвгөн', ...golem('santa', 'golem_santa_sheet_480x234', 'golem_santa_sheet_1200x585', 'lair_snow_430x464', 'defeat_santa_1500x660'),
    shot: { id: 'fx_santa_orb_144x144', frames: 8, cols: 3 }, impact: { id: 'fx_santa_boom_340x276', frames: 12, cols: 4 } },
];
/** Boss sheet-ийн frame-ууд (boss_pumpkin.py): хөвөх 0–2, ид шид, цочих, цагаан, давхих, цохих */
export const BOSS_FRAME = { cast: 3, hurt: 4, flash: 5, dash: 6, strike: 7 } as const;
/** Хөвөх давталт: 0 → 1 → 2 → 1 (pixel алхмаар дээш доош) */
export const HOVER = [0, 1, 2, 1];

export { gateOf, isBossNode, pathLessons, unitOf };

// shortcut: Монгол хэлний замыг түр нуусан; буцаахад 'mongolian'-ийг энд нэмнэ.
/** Сурах зам, хичээл сонголт, өнөөдрийн хичээлд харагдах хичээлүүд. */
export const PATH_SUBJECTS: Subject[] = ['math', 'physics'];
/** Нуусан хичээл хадгалагдсан бол математик. */
export const pathSubject = (s: Subject | null | undefined): Subject => (s && PATH_SUBJECTS.includes(s) ? s : 'math');

export interface PathUnit {
  /** бүлгийн эхний зангилаа, нахиа, бэлэг, хэцүү сорил, boss */
  start: number;
  sapling: number;
  gift: number;
  myst: number;
  boss: number;
  /** бүлгийн дэвсгэрийн дээд зах: декорын (үүл, эрвээхэй) байрлал бүлэг бүрт адил */
  top: number;
  /** нууц хайрцагтай зангилаанууд (3-р бүлэг): бэлэг, хэцүү сорилын тэмдгийн оронд */
  chests: number[];
}

export interface PathLayout {
  /** замын хичээлийн тоо */
  n: number;
  nodes: PathNode[];
  /** Зангилаанууд, дээрээс доош (Duolingo шиг) */
  trail: TrailPoint[];
  units: PathUnit[];
  /** тулааны хаалганы зангилаа (BOSSES ижил дараалалтай) */
  gates: number[];
}

/** Зигзагийн далайц (төвөөс), зангилааны хэвтээ хязгаар (хамгаалагчид дэлгэцээс гарахгүй), бүлгийн дээд/доод зай */
const ZIG = 80;
const X_MIN = 115;
const X_MAX = 275;
const PAD_TOP = 70;
/** 1-р бүлгийн эхэнд: дээд баннер газрын зураг дээр хөвдөг тул эхний зангилаа түүний доор */
const PAD_FIRST = 150;
/** 2-р бүлгийн зүүн/баруун гарын зангилаа голдоо ойр: хамгаалагчид газрын зургийн хоёр захад зогсоно (PathMap) */
const GUARD_NODE_DX = 20;
/** boss болон түүний доорх шошгонд зай: дараагийн бүлгийн баннер хүртэл */
const PAD_BOTTOM = 112;

/**
 * `n` хичээлтэй замын газрын зураг: бүлэг бүрийн хичээлүүд өөрийн дэвсгэр дээр дээрээс доош жигд зайтай (хичээл
 * олон бол ойр, цөөн бол алс), Duolingo шиг зигзаг; boss нь бүлгийн доод талд голдоо. Нахиа, бэлэг, хэцүү сорил нь
 * бүлгийн ижил хэсэгт (16 зангилаатай анхны зургийн 3, 9, 12).
 */
export function pathLayout(n: number): PathLayout {
  const gates = gateNodes(n);
  const chests = chestNodes(n);
  const nodes: PathNode[] = [];
  const units: PathUnit[] = [];
  for (let u = 0; u < UNIT_COUNT; u++) {
    const top = CHAPTER_TOPS[u];
    const y0 = top + (u === 0 ? PAD_FIRST : PAD_TOP);
    const y1 = top + chapterHeight(MAP_CHAPTERS[u]) - PAD_BOTTOM;
    const boss = gates[UNIT_GATE[u]];
    const start = u === 0 ? 0 : units[u - 1].boss + 1;
    const m = boss - start;
    const at = (f: number) => start + Math.min(m - 1, Math.round(f * m));
    const unit = { start, sapling: at(3 / 15), gift: at(9 / 15), myst: at(12 / 15), boss, top, chests: chests.filter((c) => c >= start && c < boss) };
    units.push(unit);
    const kind = (i: number): NodeKind =>
      i === boss ? 'boss' : unit.chests.includes(i) ? 'chest' : i === unit.myst ? 'myst' : i === unit.gift ? 'gift' : i === unit.sapling ? 'sapling' : 'stone';
    for (let k = 0; k <= m; k++) {
      const g = gates.indexOf(start + k);
      const x =
        k === m
          ? MAP_W / 2
          : g >= 0 && BOSSES[g].role
            ? MAP_W / 2 + (BOSSES[g].role === 'left' ? GUARD_NODE_DX : -GUARD_NODE_DX)
            : Math.round(Math.max(X_MIN, Math.min(X_MAX, MAP_W / 2 + ZIG * Math.sin((k * Math.PI) / 4))));
      nodes.push({ i: start + k, x, y: Math.round(m ? y0 + ((y1 - y0) * k) / m : y1), kind: kind(start + k) });
    }
  }
  return { n, nodes, trail: nodes.map(({ x, y, i }) => ({ x, y, i })), units, gates };
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
  if (g >= 0) {
    const b = BOSSES[g];
    return isBossNode(n, i) ? S.path.boss(b.name) : b.soldier ? S.path.soldier(b.name) : b.helper ? S.path.helper(b.name) : S.path.guard(b.role === 'left', b.name);
  }
  return lessonAt(lessons, i)?.title ?? TITLES[subject][i - unitOf(n, i)];
}
