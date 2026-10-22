import { GAME } from '../config/game';

/** `unit`-р бүлгийн boss-ын зангилаа (0-ээс): бүлгийн сүүлийн зангилаа. Апп-ын газрын зурагтай (path.ts) ижил. */
export const bossNode = (unit: number) => unit * GAME.BOSS.UNIT_SIZE + GAME.BOSS.UNIT_SIZE - 1;

/** Даалгаврын ялалт: олонх зөв (5 асуултад 3). */
export const bossWon = (correctCount: number) => correctCount > GAME.QUESTIONS_PER_TASK / 2;

/**
 * `unit`-р boss-той тулалдаж болох уу: дараалсан дараагийн boss байх ёстой бөгөөд баавгай түүний зангилаанд
 * (level − 1 ≥ boss зангилаа) хүрсэн байна. Ялсан эсвэл алгассан boss-той тулалдахгүй.
 */
export function bossBlock(level: number, bossesBeaten: number, unit: number): 'BOSS_LOCKED' | null {
  if (unit !== bossesBeaten || unit >= GAME.BOSS.COUNT) return 'BOSS_LOCKED';
  return level - 1 >= bossNode(unit) ? null : 'BOSS_LOCKED';
}
