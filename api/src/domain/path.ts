import { GAME } from '../config/game';
import { currentNode, GATE_COUNT, gateNodes, lessonIndex, nodeCount, pathLessons, UNITS } from '../../../shared/path';

// Сурах замын тооцоо shared/path.ts-д (апп-ын газрын зурагтай нэг эх): даалгаврын асуулт нь апп-ын харуулж буй
// зангилааны хичээлээс гарна.
export { bossNode, currentNode, gateNodes, gateOf, isBossNode, lessonIndex, nodeCount, pathLessons, unitOf } from '../../../shared/path';

/**
 * Даалгаврын дараах давсан зангилааны тоо. Ердийн даалгаварт PATH_PASS_CORRECT-оос цөөнгүй зөв бол нэг ахина, гэхдээ
 * давж амжаагүй хаалганаас (boss, түүний гар) цааш явахгүй (хаалган дээр ердийн даалгавар хийвэл хөдлөхгүй). Хаалгыг
 * давбал түүний дараагийн зангилаанд очно.
 */
export function nodesAfter(n: number, nodes: number, gatesBeaten: number, correctCount: number, beatGate: boolean): number {
  const last = nodeCount(n) - 1;
  const gate = gatesBeaten < GATE_COUNT ? gateNodes(n)[gatesBeaten] : last;
  if (beatGate) return Math.min(last, gate + 1);
  const cur = currentNode(n, nodes + 1, gatesBeaten);
  return correctCount >= GAME.PATH_PASS_CORRECT && cur < gate ? cur + 1 : cur;
}

/**
 * Даалгаврын замын урт: эхлэх үед хадгалсан (tasks.path_lessons). Migration 0020-оос өмнө эхэлсэн даалгаварт (NULL)
 * одоогийн номынх: номгүй замаар (24) тооцвол номтой хүүхэд даалгавраа дуусгахад замаараа ухардаг байсан (30 → 15).
 */
export const taskPathLessons = (stored: number | null, bookLessons: number) => stored ?? pathLessons(bookLessons);

/** Зангилааны номын хичээл (boss эсвэл номгүй бол null). */
export function lessonAt<T>(lessons: readonly T[], i: number): T | null {
  if (lessons.length < UNITS * 3) return null;
  const k = lessonIndex(lessons.length, i);
  return k === null ? null : (lessons[k] ?? null);
}
