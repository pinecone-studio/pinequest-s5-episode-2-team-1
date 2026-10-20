import { GAME, type Tier } from '../config/game';

/** level = floor(XP / 100) + 1. XP хэзээ ч буурахгүй. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / GAME.XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelFromXp(xp);
  return { level, current: Math.max(0, xp) - (level - 1) * GAME.XP_PER_LEVEL, needed: GAME.XP_PER_LEVEL };
}

/** 6–7 → 1, 8–9 → 2, 10 → 3; бусад анги → null */
export function tierForGrade(grade: number): Tier | null {
  return GAME.GRADE_TO_TIER[grade] ?? null;
}
