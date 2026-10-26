import type { AvatarBody, LookBody, Me, MyProfileResponse, ProfileResponse, PublicProfile, SubjectSkill } from '../../../shared/types';
import { COSMETICS, type Cosmetic, OUTFIT_ITEMS } from '../config/cosmetics';
import { SUBJECTS, type Subject } from '../config/game';
import { bossesIn } from '../domain/boss';
import { levelProgress } from '../domain/level';
import { parseBearLook } from '../domain/profile';
import { normalizeStreak } from '../domain/streak';
import { ubDay } from '../domain/time';
import { ApiError } from '../lib/errors';
import { friendStatus } from './friends';
import { getCatalog } from './items';
import { assignProfileCode, ensureProfileCode, profileOwner } from './profileCodes';
import { getUserRow, loadMe, loadSubjectPaths, streakStateOf } from './users';

/** Эзэмшиж буй дэвсгэр, хувцасны key (үнэгүйг оролцуулна; нүдний шил, чихэвч нь items хүснэгтээс). */
async function loadCollection(db: D1Database, userId: number): Promise<PublicProfile['collection']> {
  const [cosmetics, items, catalog] = await Promise.all([
    db.prepare('SELECT cosmetic_id FROM user_cosmetics WHERE user_id = ?').bind(userId).all<{ cosmetic_id: string }>(),
    db.prepare('SELECT item_id FROM user_items WHERE user_id = ?').bind(userId).all<{ item_id: string }>(),
    getCatalog(db),
  ]);
  const ownedCosmetics = new Set(cosmetics.results.map((r) => r.cosmetic_id));
  const ownedItems = new Set(items.results.map((r) => r.item_id));
  const owned = (kind: Cosmetic['kind']) =>
    COSMETICS.filter((c) => c.kind === kind && (c.price === 0 || ownedCosmetics.has(c.id))).map((c) => c.key);
  const itemOutfits = Object.entries(OUTFIT_ITEMS)
    .filter(([, itemId]) => ownedItems.has(itemId) || catalog.get(itemId)?.price === 0)
    .map(([key]) => key);
  return { bgs: owned('bg'), outfits: [...owned('outfit'), ...itemOutfits] };
}

/** Хичээл бүрийн сурах зам ба даалгаврын зөв/нийт хариулт. */
async function loadSkills(db: D1Database, userId: number): Promise<SubjectSkill[]> {
  const [paths, answers] = await Promise.all([
    loadSubjectPaths(db, userId),
    // choice: NULL = хариулаагүй, -1 = "Асуулт буруу байна" (алгассан) тул хоёулаа тоологдохгүй.
    db
      .prepare(
        `SELECT t.subject, COALESCE(SUM(tq.correct = 1), 0) AS correct, COALESCE(SUM(tq.choice >= 0), 0) AS answered
         FROM tasks t JOIN task_questions tq ON tq.task_id = t.id
         WHERE t.user_id = ? GROUP BY t.subject`,
      )
      .bind(userId)
      .all<{ subject: Subject; correct: number; answered: number }>(),
  ]);
  return SUBJECTS.map((subject) => {
    const row = answers.results.find((r) => r.subject === subject);
    const path = paths[subject];
    return { subject, level: path.level, bossesBeaten: bossesIn(path.bossesBeaten), correct: row?.correct ?? 0, answered: row?.answered ?? 0 };
  });
}

/** Бусдад харагдах профайл. Харж буй хүн бусдын өгөгдлийг өөрчлөхгүйн тулд streak-ийг DB-д бичилгүй тооцно. */
export async function loadPublicProfile(db: D1Database, userId: number, now = Date.now()): Promise<PublicProfile> {
  const user = await getUserRow(db, userId);
  const [skills, collection, days, duels] = await Promise.all([
    loadSkills(db, userId),
    loadCollection(db, userId),
    db
      .prepare(`SELECT COUNT(DISTINCT day) AS n FROM tasks WHERE user_id = ? AND status = 'completed'`)
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS played, COALESCE(SUM(winner_id = ?), 0) AS won
         FROM duels WHERE status = 'finished' AND (creator_id = ? OR opponent_id = ?)`,
      )
      .bind(userId, userId, userId)
      .first<{ played: number; won: number }>(),
  ]);
  const progress = levelProgress(user.xp);
  return {
    username: user.username,
    name: user.display_name ?? user.username,
    grade: user.grade,
    level: progress.level,
    levelXp: progress.current,
    levelXpNeeded: progress.needed,
    streak: normalizeStreak(streakStateOf(user), ubDay(now)).state.streak,
    studyDays: days?.n ?? 0,
    look: parseBearLook(user.bear_look),
    collection,
    skills,
    duels: { played: duels?.played ?? 0, won: duels?.won ?? 0 },
    joinedAt: user.created_at,
  };
}

/** Миний профайл ба хуваалцах код (анх нээхэд код үүснэ). */
export async function myProfile(db: D1Database, userId: number): Promise<MyProfileResponse> {
  const [code, profile] = await Promise.all([ensureProfileCode(db, userId), loadPublicProfile(db, userId)]);
  return { profile, code };
}

/** Кодоо солино: хуучин кодоор профайл олдохоо болино. */
export async function rotateProfileCode(db: D1Database, userId: number): Promise<MyProfileResponse> {
  const code = await assignProfileCode(db, userId, true);
  return { profile: await loadPublicProfile(db, userId), code };
}

/** Бусдын профайлыг кодоор нь олно (нэр, id-аар хайхгүй: кодыг нь мэдэх хүн л харна). */
export async function findProfile(db: D1Database, viewerId: number, input: string): Promise<ProfileResponse> {
  const ownerId = await profileOwner(db, input);
  const [profile, friend] = await Promise.all([loadPublicProfile(db, ownerId), friendStatus(db, viewerId, ownerId)]);
  return { profile, isMe: ownerId === viewerId, friend };
}

/** Нүүрэн дээр сонгосон дэвсгэр, хувцсыг хадгална (профайл дээр бусдад харагдана). Зөвхөн эзэмшиж буйгаа. */
export async function setBearLook(db: D1Database, userId: number, look: LookBody): Promise<Me> {
  const known = (kind: Cosmetic['kind'], key: string) =>
    COSMETICS.some((c) => c.kind === kind && c.key === key) || (kind === 'outfit' && Object.keys(OUTFIT_ITEMS).includes(key));
  if (!known('bg', look.bg) || !known('outfit', look.outfit)) throw new ApiError(400, 'BAD_REQUEST', 'Дэвсгэр эсвэл хувцас буруу');
  const { bgs, outfits } = await loadCollection(db, userId);
  if (!bgs.includes(look.bg) || !outfits.includes(look.outfit)) throw new ApiError(403, 'NOT_OWNED', 'Эхлээд авна уу');
  // үс, царай, цээжний толбыг (PUT /me/avatar) хөндөхгүй
  await db.prepare(`UPDATE users SET bear_look = json_set(${LOOK_JSON}, '$.bg', ?, '$.outfit', ?) WHERE id = ?`).bind(look.bg, look.outfit, userId).run();
  return loadMe(db, userId);
}

/** bear_look хоосон эсвэл эвдэрсэн бол хоосон объектоос эхэлнэ */
const LOOK_JSON = "CASE WHEN json_valid(bear_look) THEN bear_look ELSE '{}' END";

/** Профайлын нэр ба баавгайн үс, царай, цээжний толбо (бүртгүүлсний дараа, дараа нь профайлаас солино). */
export async function setAvatar(db: D1Database, userId: number, body: AvatarBody): Promise<Me> {
  await db
    .prepare(`UPDATE users SET display_name = ?, bear_look = json_set(${LOOK_JSON}, '$.fur', ?, '$.face', ?, '$.chest', json(?)) WHERE id = ?`)
    .bind(body.name, body.fur, body.face, String(body.chest), userId)
    .run();
  return loadMe(db, userId);
}
