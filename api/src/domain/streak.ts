import { GAME } from '../config/game';
import { addDays, daysBetween } from './time';

export interface StreakState {
  streak: number;
  /** Сүүлд streak-д тоологдсон эсвэл хамгаалалтаар хамгаалагдсан UB өдөр. */
  lastDay: string | null;
  shieldHeld: number;
  shieldBoughtDay: string | null;
  shieldUsedDay: string | null;
}

/**
 * Өнөөдрийн байдлаар streak-ийг засна. Профайл уншихаас болон даалгавар бүртгэхээс өмнө дуудна.
 * - lastDay өнөөдөр эсвэл өчигдөр: өөрчлөлтгүй
 * - яг 1 өдөр алгассан + хамгаалалттай: хамгаалалт зарцуулагдаж, алгассан өдөр хамгаалагдсанд
 *   тооцогдоно (streak тасрахгүй, гэхдээ тэр өдрөөр нэмэгдэхгүй)
 * - бусад тохиолдолд streak 0 (2+ өдөр алгасвал хамгаалалт зарцуулагдахгүй, гартаа үлдэнэ)
 */
export function normalizeStreak(s: StreakState, today: string): { state: StreakState; shieldConsumed: boolean } {
  if (s.streak === 0 || s.lastDay === null) return { state: s, shieldConsumed: false };
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 1) return { state: s, shieldConsumed: false };
  if (gap === 2 && s.shieldHeld > 0) {
    const covered = addDays(s.lastDay, 1);
    return {
      state: { ...s, shieldHeld: s.shieldHeld - 1, lastDay: covered, shieldUsedDay: covered },
      shieldConsumed: true,
    };
  }
  return { state: { ...s, streak: 0 }, shieldConsumed: false };
}

/** Өнөөдөр даалгавар дуусгасныг бүртгэнэ. normalizeStreak-ийн дараа дуудна. */
export function registerTaskDay(s: StreakState, today: string): StreakState {
  if (s.lastDay === today) return s;
  const continues = s.streak > 0 && s.lastDay !== null && daysBetween(s.lastDay, today) === 1;
  return { ...s, streak: continues ? s.streak + 1 : 1, lastDay: today };
}

/** min(1 + 0.1 × (streak − 1), 2.0); streak < 1 үед ×1.0 */
export function streakMultiplier(streak: number): number {
  const raw = 1 + GAME.STREAK_MULT_STEP * (Math.max(1, streak) - 1);
  return Math.min(GAME.STREAK_MULT_MAX, Math.round(raw * 100) / 100);
}
