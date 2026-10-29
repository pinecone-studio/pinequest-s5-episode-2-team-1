import { BAG_ITEMS, type BagItem } from '../../../shared/loot';
import type { Me, SubjectPath } from '../../../shared/types';
import { ACTIVE_SUBJECTS, GAME, SUBJECTS, type Subject } from '../config/game';
import { levelProgress } from '../domain/level';
import { type Lives, livesNow, nextLifeAt, spendLife } from '../domain/lives';
import { parseBearLook } from '../domain/profile';
import { shieldBlock, shieldNextBuyDay } from '../domain/shield';
import { maxStake } from '../domain/stake';
import { normalizeStreak, registerTaskDay, type StreakState, streakMultiplier } from '../domain/streak';
import { ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import { avatarLook, type CatalogItem, getCatalog, parseEquipped } from './items';

export interface UserRow {
  id: number;
  username: string;
  display_name: string | null;
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
  bear_look: string | null;
  created_at: number;
  is_admin: number;
  lives: number;
  lives_at: number | null;
  onboarding: string | null;
}

const USER_COLUMNS =
  'id, username, display_name, grade, tier, xp, points, streak, last_streak_day, shield_held, shield_bought_day, shield_used_day, equipped, bear_look, created_at, is_admin, lives, lives_at, onboarding';

export async function getUserRow(db: D1Database, id: number): Promise<UserRow> {
  const row = await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(id).first<UserRow>();
  if (!row) throw new ApiError(401, 'UNAUTHORIZED', 'Хэрэглэгч олдсонгүй');
  return row;
}

/** Олон хэрэглэгчийг нэг query-гээр, `ids`-ийн дарааллаар уншина. */
export async function getUserRows(db: D1Database, ids: number[]): Promise<UserRow[]> {
  const { results } = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(ids))
    .all<UserRow>();
  const byId = new Map(results.map((r) => [r.id, r]));
  return ids.map((id) => {
    const row = byId.get(id);
    if (!row) throw new ApiError(401, 'UNAUTHORIZED', 'Хэрэглэгч олдсонгүй');
    return row;
  });
}

export function streakStateOf(
  u: Pick<UserRow, 'streak' | 'last_streak_day' | 'shield_held' | 'shield_bought_day' | 'shield_used_day'>,
): StreakState {
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

/** Хариулаагүй, надад ирсэн найзын хүсэлт (аватар дээрх цэг). */
export async function countFriendRequests(db: D1Database, userId: number): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM friendships WHERE to_id = ? AND status = 'pending'`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Хичээл бүрийн сурах замын ахиц (subject_progress); тухайн хичээлд даалгавар хийгээгүй бол 0. */
export async function loadSubjectPaths(db: D1Database, userId: number): Promise<Record<Subject, SubjectPath>> {
  const [{ results }, { results: stages }, { results: chests }] = await Promise.all([
    db
      .prepare('SELECT subject, xp, nodes, bosses_beaten FROM subject_progress WHERE user_id = ?')
      .bind(userId)
      .all<{ subject: Subject; xp: number; nodes: number; bosses_beaten: number }>(),
    db.prepare('SELECT subject, node, stage FROM node_stages WHERE user_id = ?').bind(userId).all<{ subject: Subject; node: number; stage: number }>(),
    db.prepare('SELECT subject, node FROM chests WHERE user_id = ?').bind(userId).all<{ subject: Subject; node: number }>(),
  ]);
  const paths = {} as Record<Subject, SubjectPath>;
  for (const subject of SUBJECTS) {
    const row = results.find((r) => r.subject === subject);
    paths[subject] = {
      xp: row?.xp ?? 0,
      level: (row?.nodes ?? 0) + 1,
      bossesBeaten: row?.bosses_beaten ?? 0,
      stages: Object.fromEntries(stages.filter((s) => s.subject === subject).map((s) => [s.node, s.stage])),
      chests: chests.filter((c) => c.subject === subject).map((c) => c.node),
    };
  }
  return paths;
}

/** users.onboarding JSON-оос сонгосон хичээл; эвдэрсэн эсвэл байхгүй бол null. */
export function onboardingSubject(json: string | null): Subject | null {
  try {
    const subject = json ? (JSON.parse(json) as { subject?: unknown }).subject : null;
    return ACTIVE_SUBJECTS.includes(subject as (typeof ACTIVE_SUBJECTS)[number]) ? (subject as Subject) : null;
  } catch {
    return null;
  }
}

export function buildMe(
  user: UserRow,
  today: string,
  todayTasks: number,
  catalog: Map<string, CatalogItem>,
  paths: Record<Subject, SubjectPath>,
  friendRequests: number,
  bag: Record<BagItem, number>,
  now = Date.now(),
): Me {
  const lives = livesNow(livesOf(user), now);
  const s = streakStateOf(user);
  const progress = levelProgress(user.xp);
  const block = shieldBlock(s, user.points, today);
  const equipped = parseEquipped(user.equipped);
  return {
    id: user.id,
    username: user.username,
    name: user.display_name ?? user.username,
    profileSet: user.display_name !== null,
    onboarded: user.onboarding !== null,
    subject: onboardingSubject(user.onboarding),
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
    questionsPerTask: GAME.QUESTIONS_PER_TASK,
    pointsPerCorrect: GAME.POINTS_PER_CORRECT,
    xpPerCorrect: GAME.XP_PER_CORRECT,
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
    paths,
    look: parseBearLook(user.bear_look),
    friendRequests,
    today,
    admin: user.is_admin === 1,
    lives: lives.lives,
    maxLives: GAME.LIVES.MAX,
    nextLifeAt: nextLifeAt(lives),
    bag,
  };
}

/** Цүнхний хэрэглэгдэхүүний тоо (нууц хайрцгаас, shared/loot.ts). */
export async function loadBag(db: D1Database, userId: number): Promise<Record<BagItem, number>> {
  const { results } = await db.prepare('SELECT item, qty FROM inventory WHERE user_id = ?').bind(userId).all<{ item: string; qty: number }>();
  return Object.fromEntries(BAG_ITEMS.map((i) => [i, results.find((r) => r.item === i)?.qty ?? 0])) as Record<BagItem, number>;
}

export const livesOf = (u: Pick<UserRow, 'lives' | 'lives_at'>): Lives => ({ lives: u.lives, at: u.lives_at });
/** users.lives, lives_at-д бичих утга */
export const livesArgs = (l: Lives) => [l.lives, l.at] as const;

/** Буруу хариултын нэг амийг хасна; аль хэдийн 0 бол доош оруулахгүй. */
export async function spendUserLife(db: D1Database, userId: number, now = Date.now()): Promise<boolean> {
  const lives = livesNow(livesOf(await getUserRow(db, userId)), now);
  if (lives.lives <= 0) return false;
  const next = spendLife(lives, now);
  await db.prepare('UPDATE users SET lives = ?, lives_at = ? WHERE id = ?').bind(...livesArgs(next), userId).run();
  return true;
}

/**
 * Амьгүй бол (admin биш) NO_LIVES: нөхөгдтөл бодлого, давтлага, баавгайтай ярилцах хаалттай. Одоогийн амийг буцаана.
 */
export function requireLife(user: UserRow, now = Date.now()): Lives {
  const lives = livesNow(livesOf(user), now);
  if (lives.lives <= 0 && user.is_admin !== 1) throw new ApiError(409, 'NO_LIVES', 'Амь дууссан. Шинэ амь нөхөгдөхийг хүлээнэ үү');
  return lives;
}

export async function loadMe(db: D1Database, userId: number, now = Date.now()): Promise<Me> {
  const today = ubDay(now);
  const user = await syncStreak(db, await getUserRow(db, userId), today);
  const [todayTasks, catalog, paths, friendRequests, bag] = await Promise.all([
    countTasksToday(db, userId, today),
    getCatalog(db),
    loadSubjectPaths(db, userId),
    countFriendRequests(db, userId),
    loadBag(db, userId),
  ]);
  return buildMe(user, today, todayTasks, catalog, paths, friendRequests, bag, now);
}
