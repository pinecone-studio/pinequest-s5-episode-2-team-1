import { GAME } from '../config/game';
import type { StreakState } from './streak';
import { addDays, daysBetween } from './time';

export type ShieldBlock = 'SHIELD_HELD' | 'SHIELD_COOLDOWN' | 'INSUFFICIENT_POINTS';

/** Хамгаалалт авч болохгүй шалтгаан, эсвэл null (авч болно). */
export function shieldBlock(s: StreakState, points: number, today: string): ShieldBlock | null {
  if (s.shieldHeld >= GAME.SHIELD.MAX_HELD) return 'SHIELD_HELD';
  if (s.shieldBoughtDay && daysBetween(s.shieldBoughtDay, today) < GAME.SHIELD.COOLDOWN_DAYS) {
    return 'SHIELD_COOLDOWN';
  }
  if (points < GAME.SHIELD.PRICE) return 'INSUFFICIENT_POINTS';
  return null;
}

/** 7 хоногийн хязгаар дуусах өдөр (хязгаар идэвхгүй бол null). */
export function shieldNextBuyDay(s: StreakState, today: string): string | null {
  if (!s.shieldBoughtDay) return null;
  const next = addDays(s.shieldBoughtDay, GAME.SHIELD.COOLDOWN_DAYS);
  return daysBetween(today, next) > 0 ? next : null;
}
