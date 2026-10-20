import { GAME } from '../config/game';
import { streakMultiplier } from './streak';

/**
 * Даалгаврын шагнал. `streakAfter` нь энэ даалгаврыг бүртгэсний дараах streak
 * (шинэ хэрэглэгчийн эхний даалгавар → 1 → ×1.0).
 */
export function taskReward(correctCount: number, streakAfter: number) {
  const multiplier = streakMultiplier(streakAfter);
  const perCorrect = Math.round(GAME.POINTS_PER_CORRECT * multiplier);
  return {
    multiplier,
    points: correctCount * perCorrect,
    xp: correctCount * GAME.XP_PER_CORRECT,
  };
}
