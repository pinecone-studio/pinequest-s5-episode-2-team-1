import type { Me } from '../../../shared/types';
import { GAME } from '../config/game';
import { levelProgress } from '../domain/level';
import { shieldBlock, shieldNextBuyDay } from '../domain/shield';
import { maxStake } from '../domain/stake';
import { normalizeStreak, registerTaskDay, type StreakState, streakMultiplier } from '../domain/streak';
import { ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import { avatarLook, type CatalogItem, getCatalog, parseEquipped } from './items';

export interface UserRow {
  id: number;
  username: string;
  grade: number;
  tier: number;
  xp: number;
  points: number;
  streak: number;
  last_streak_day: string | null;
  shield_held: number;
  shield_bought_day: string | null;
  shield_used_day: string | null;
  equipped: string;
  created_at: number;
}

const USER_COLUMNS =
  'id, username, grade, tier, xp, points, streak, last_streak_day, shield_held, shield_bought_day, shield_used_day, equipped, created_at';

export async function getUserRow(db: D1Database, id: number): Promise<UserRow> {
  const row = await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(id).first<UserRow>();
  if (!row) throw new ApiError(401, 'UNAUTHORIZED', 'Хэрэглэгч олдсонгүй');
  return row;
}

export function streakStateOf(u: UserRow): StreakState {
  return {
    streak: u.streak,
    lastDay: u.last_streak_day,
    shieldHeld: u.shield_held,
    shieldBoughtDay: u.shield_bought_day,
    shieldUsedDay: u.shield_used_day,
  };
}

export function withStreakState(u: UserRow, s: StreakState): UserRow {
  return {
    ...u,
    streak: s.streak,
    last_streak_day: s.lastDay,
    shield_held: s.shieldHeld,
    shield_bought_day: s.shieldBoughtDay,
    shield_used_day: s.shieldUsedDay,
  };
}

/**
 * Алгассан өдөр байвал streak-ийг 0 болгох / хамгаалалтыг зарцуулахыг DB-д хадгална.
 * Optimistic: хооронд нь өөр хүсэлт өөрчилсөн бол юу ч бичихгүй.
 */
export async function syncStreak(db: D1Database, user: UserRow, today: string): Promise<UserRow> {
  const before = streakStateOf(user);
  const { state } = normalizeStreak(before, today);
  if (state === before) return user;
  await db
    .prepare(
      `UPDATE users SET streak = ?, last_streak_day = ?, shield_held = ?, shield_used_day = ?
       WHERE id = ? AND streak = ? AND last_streak_day IS ? AND shield_held = ?`,
    )
    .bind(state.streak, state.lastDay, state.shieldHeld, state.shieldUsedDay, user.id, before.streak, before.lastDay, before.shieldHeld)
    .run();
  return withStreakState(user, state);
}

export async function countTasksToday(db: D1Database, userId: number, today: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND day = ?')
    .bind(userId, today)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export function buildMe(user: UserRow, today: string, todayTasks: number, catalog: Map<string, CatalogItem>): Me {
  const s = streakStateOf(user);
  const progress = levelProgress(user.xp);
  const block = shieldBlock(s, user.points, today);
  const equipped = parseEquipped(user.equipped);
  return {
    id: user.id,
    username: user.username,
    grade: user.grade,
    tier: user.tier,
    xp: user.xp,
    level: progress.level,
    levelXp: progress.current,
    levelXpNeeded: progress.needed,
    points: user.points,
    streak: user.streak,
    streakDoneToday: user.last_streak_day === today,
    nextMultiplier: streakMultiplier(registerTaskDay(s, today).streak),
    todayTasks,
    dailyLimit: GAME.DAILY_TASK_LIMIT,
    shield: {
      held: user.shield_held > 0,
      price: GAME.SHIELD.PRICE,
      canBuy: block === null,
      blockedBy: block,
      nextBuyDay: shieldNextBuyDay(s, today),
      usedDay: user.shield_used_day,
    },
    equipped,
    avatar: avatarLook(equipped, catalog),
    maxStake: maxStake(user.points),
    today,
  };
}

export async function loadMe(db: D1Database, userId: number, now = Date.now()): Promise<Me> {
  const today = ubDay(now);
  const user = await syncStreak(db, await getUserRow(db, userId), today);
  const [todayTasks, catalog] = await Promise.all([countTasksToday(db, userId, today), getCatalog(db)]);
  return buildMe(user, today, todayTasks, catalog);
}
