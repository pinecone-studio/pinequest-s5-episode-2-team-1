import { GAME } from '../config/game';
import { currentNode, GATE_COUNT, gateNodes, UNIT_GATE } from '../../../shared/path';

/** Давсан `gates` хаалганаас хэд нь жинхэнэ boss вэ (профайл дээр харуулна). */
export const bossesIn = (gates: number) => UNIT_GATE.filter((g) => g < gates).length;

/** Даалгаврын ялалт: олонх зөв (5 асуултад 3). */
export const bossWon = (correctCount: number) => correctCount > GAME.QUESTIONS_PER_TASK / 2;

/**
 * `n` хичээлтэй замд `gate`-р хаалгатай тулалдаж болох уу: дараалсан дараагийн хаалга байх ёстой бөгөөд баавгай
 * түүний зангилаанд хүрсэн байна. Давсан эсвэл алгассан хаалгатай тулалдахгүй (зүүн гарыг давж байж баруун гар).
 */
export function bossBlock(n: number, level: number, gatesBeaten: number, gate: number): 'BOSS_LOCKED' | null {
  if (gate !== gatesBeaten || gate >= GATE_COUNT) return 'BOSS_LOCKED';
  return currentNode(n, level, gatesBeaten) === gateNodes(n)[gate] ? null : 'BOSS_LOCKED';
}
