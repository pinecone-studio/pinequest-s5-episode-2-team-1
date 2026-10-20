import { GAME } from '../config/game';

/** Бооцооны дээд хэмжээ: одоогийн онооны 20%, доош тоймлоно (бүхэл тооны тооцоо). */
export function maxStake(points: number): number {
  return Math.floor((Math.max(0, points) * GAME.DUEL.STAKE_MAX_PERCENT) / 100);
}

export type StakeError = 'STAKE_TOO_LOW' | 'STAKE_TOO_HIGH';

export function stakeError(stake: number, points: number): StakeError | null {
  if (!Number.isInteger(stake) || stake < GAME.DUEL.STAKE_MIN) return 'STAKE_TOO_LOW';
  if (stake > maxStake(points)) return 'STAKE_TOO_HIGH';
  return null;
}
