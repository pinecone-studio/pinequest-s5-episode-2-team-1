import { GAME } from '../config/game';
import { gateNode } from './boss';

// Апп-ын газрын зурагтай (mobile/src/lib/pixelBear/path.ts: currentNode, lessonsAt) ижил байх ёстой: даалгаврын
// асуулт нь апп-ын харуулж буй зангилааны хичээлээс гарна.
const { UNIT_SIZE, COUNT, GATES } = GAME.BOSS;
const NODE_COUNT = UNIT_SIZE * COUNT;
/** Boss-гүй зангилааны тоо: номын бүх хичээл эдгээрт жигд тарна. */
const LESSON_NODES = NODE_COUNT - COUNT;

/** Сурах зам дээрх одоогийн зангилаа = шат − 1, гэхдээ давж амжаагүй хаалганы (boss, түүний гар) дэргэд зогсоно. */
export function currentNode(level: number, gatesBeaten: number): number {
  const gate = gatesBeaten < GATES.length ? gateNode(gatesBeaten) : NODE_COUNT - 1;
  return Math.max(0, Math.min(NODE_COUNT - 1, gate, level - 1));
}

/**
 * Даалгаврын дараах давсан зангилааны тоо. Ердийн даалгаварт PATH_PASS_CORRECT-оос цөөнгүй зөв бол нэг ахина, гэхдээ
 * давж амжаагүй хаалганаас (boss, түүний гар) цааш явахгүй (хаалган дээр ердийн даалгавар хийвэл хөдлөхгүй). Хаалгыг
 * давбал түүний дараагийн зангилаанд очно.
 */
export function nodesAfter(nodes: number, gatesBeaten: number, correctCount: number, beatGate: boolean): number {
  const gate = gatesBeaten < GATES.length ? gateNode(gatesBeaten) : NODE_COUNT - 1;
  if (beatGate) return Math.min(NODE_COUNT - 1, gate + 1);
  const cur = Math.min(nodes, gate);
  return correctCount >= GAME.PATH_PASS_CORRECT && cur < gate ? cur + 1 : cur;
}

/** Зангилаанд ногдох номын хичээлүүд (boss зангилаанд хичээл байхгүй). */
export function lessonsAt<T>(lessons: readonly T[], i: number): T[] {
  if (lessons.length === 0 || i % UNIT_SIZE === UNIT_SIZE - 1) return [];
  const k = i - Math.floor(i / UNIT_SIZE);
  const from = Math.floor((k * lessons.length) / LESSON_NODES);
  const to = Math.max(from + 1, Math.floor(((k + 1) * lessons.length) / LESSON_NODES));
  return lessons.slice(from, to);
}
