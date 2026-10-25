import { GAME } from '../config/game';

const { GATES, UNIT_SIZE } = GAME.BOSS;

/** `g`-р хаалганы (boss эсвэл түүний зүүн/баруун гар) зангилаа (0-ээс). Апп-ын газрын зурагтай (path.ts GATES) ижил. */
export const gateNode = (g: number) => GATES[g];

/** Бүлгийн сүүлийн зангилаа = жинхэнэ boss (бусад хаалга нь түүний зүүн/баруун гар). */
const isBossNode = (i: number) => i % UNIT_SIZE === UNIT_SIZE - 1;

/** Давсан `gates` хаалганаас хэд нь жинхэнэ boss вэ (профайл дээр харуулна). */
export const bossesIn = (gates: number) => GATES.slice(0, gates).filter(isBossNode).length;

/** Даалгаврын ялалт: олонх зөв (5 асуултад 3). */
export const bossWon = (correctCount: number) => correctCount > GAME.QUESTIONS_PER_TASK / 2;

/**
 * `gate`-р хаалгатай тулалдаж болох уу: дараалсан дараагийн хаалга байх ёстой бөгөөд баавгай түүний зангилаанд
 * (level − 1 ≥ зангилаа) хүрсэн байна. Давсан эсвэл алгассан хаалгатай тулалдахгүй (зүүн гарыг давж байж баруун гар).
 */
export function bossBlock(level: number, gatesBeaten: number, gate: number): 'BOSS_LOCKED' | null {
  if (gate !== gatesBeaten || gate >= GATES.length) return 'BOSS_LOCKED';
  return level - 1 >= gateNode(gate) ? null : 'BOSS_LOCKED';
}
