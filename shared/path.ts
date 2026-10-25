// Сурах зам (API ба апп нэг эх): номын хичээл бүр нэг зангилаа (нэг сэдэв). Хичээлүүдийг дарааллаар нь UNITS бүлэгт
// жигд хувааж, бүлэг бүрийн төгсгөлд boss: замын урт = хичээлийн тоо + boss. `n` = замын хичээлийн тоо (pathLessons).

export const UNITS = 3;
/** Номгүй хичээлийн замын сэдвийн тоо (апп-ын path.ts TITLES). */
export const DEFAULT_LESSONS = 24;
/** Бүлэг бүрт хамгийн цөөндөө ийм хичээл (2-р бүлгийн 2 гар + 1): эндээс цөөн бол номгүй зам. */
const MIN_PER_UNIT = 3;

/** Замын хичээлийн тоо: номын хичээлүүд; ном байхгүй (эсвэл бүлэгт хичээл хүрэхгүй) бол апп-ын сэдвүүд. */
export const pathLessons = (bookLessons: number) => (bookLessons >= UNITS * MIN_PER_UNIT ? bookLessons : DEFAULT_LESSONS);

/** Замын бүх зангилаа (boss-ыг оруулаад). */
export const nodeCount = (n: number) => n + UNITS;

/** `unit`-р бүлгийн boss-ын зангилаа (0-ээс): бүлгийн хичээлүүдийн дараах зангилаа. */
export const bossNode = (n: number, unit: number) => Math.floor(((unit + 1) * n) / UNITS) + unit;

export function unitOf(n: number, i: number): number {
  let unit = 0;
  while (unit < UNITS - 1 && i > bossNode(n, unit)) unit++;
  return unit;
}

/** Бүлгийн сүүлийн зангилаа: жинхэнэ boss (хичээлгүй). */
export const isBossNode = (n: number, i: number) => i === bossNode(n, unitOf(n, i));

/** Зангилааны хичээлийн дугаар (0-ээс); boss бол null. */
export const lessonIndex = (n: number, i: number) => (isBossNode(n, i) ? null : i - unitOf(n, i));

/**
 * Дарааллаар давах тулааны зангилаа (хаалга): бүлэг бүрийн boss; 2-р бүлэгт boss-ын өмнөх 2 хичээлд зүүн гар, баруун
 * гар (тэдгээр хичээлийн асуултаар тулална). subject_progress.bosses_beaten = давсан хаалганы тоо.
 */
export function gateNodes(n: number): number[] {
  const boss = [0, 1, 2].map((u) => bossNode(n, u));
  return [boss[0], boss[1] - 2, boss[1] - 1, boss[1], boss[2]];
}
export const GATE_COUNT = 5;
/** Бүлгийн boss-ын хаалга (хуучин апп boss-ыг бүлгийн дугаараар илгээдэг). */
export const UNIT_GATE = [0, 3, 4] as const;

/** Зангилааны хаалганы дугаар, хаалга биш бол −1. */
export const gateOf = (n: number, i: number) => gateNodes(n).indexOf(i);

/**
 * Одоогийн зангилаа = шат − 1, гэхдээ давж амжаагүй хаалганы дэргэд зогсоно, давсан хаалганаас өмнө буцахгүй
 * (номын хичээлийн тоо өөрчлөгдсөн ч бүлэг нь зөв).
 */
export function currentNode(n: number, level: number, gatesBeaten: number): number {
  const gates = gateNodes(n);
  const last = nodeCount(n) - 1;
  const start = gatesBeaten > 0 ? Math.min(last, gates[gatesBeaten - 1] + 1) : 0;
  const gate = gatesBeaten < GATE_COUNT ? gates[gatesBeaten] : last;
  return Math.max(start, Math.min(gate, level - 1));
}
