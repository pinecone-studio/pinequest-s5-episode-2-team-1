import { GAME } from '../config/game';
import { currentNode, GATE_COUNT, gateNodes, UNIT_GATE } from '../../../shared/path';

/** Давсан `gates` хаалганаас хэд нь жинхэнэ boss вэ (профайл дээр харуулна). */
export const bossesIn = (gates: number) => UNIT_GATE.filter((g) => g < gates).length;

/**
 * Хаалганы тулааны ялалт: нэг ч буруу хариултгүй (5 асуултад 5 зөв). "Асуулт буруу байна" гэж мэдээлсэн (flag)
 * асуулт алдаа биш тул тоологдохгүй; бүгдийг нь мэдээлсэн бол (зөв 0) ялахгүй.
 */
export const bossWon = (correctCount: number, wrongCount: number) => wrongCount === 0 && correctCount > 0;

/**
 * `n` хичээлтэй замд `gate`-р хаалгатай тулалдаж болох уу: дараалсан дараагийн хаалга байх ёстой бөгөөд баавгай
 * түүний зангилаанд хүрсэн байна. Давсан эсвэл алгассан хаалгатай тулалдахгүй (зүүн гарыг давж байж баруун гар).
 */
export function bossBlock(n: number, level: number, gatesBeaten: number, gate: number): 'BOSS_LOCKED' | null {
  if (gate !== gatesBeaten || gate >= GATE_COUNT) return 'BOSS_LOCKED';
  return currentNode(n, level, gatesBeaten) === gateNodes(n)[gate] ? null : 'BOSS_LOCKED';
}
