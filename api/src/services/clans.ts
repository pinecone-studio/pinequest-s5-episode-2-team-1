import { defaultClanName, normalizeClanName, XP_PER_METER } from '../../../shared/clan';
import type { BearLook, ClanDto, ClanMemberDto, ClanPreviewResponse, MyClanResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import { newClanCode, newClanPublicId, normalizeClanCode } from '../domain/clanCode';
import { levelFromXp } from '../domain/level';
import { parseBearLook } from '../domain/profile';
import { normalizeStreak } from '../domain/streak';
import { ubDay, weekStart } from '../domain/time';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { ensureProfileCode, profileOwner } from './profileCodes';
import { getUserRow, streakStateOf, type UserRow } from './users';

// Уул (ангийн баг): нэг хүүхэд нэг л Ууланд (clan_members.user_id PRIMARY KEY), Ууланд хамгийн ихдээ 40.
// Гишүүдийн XP Уулыг өндөрсгөнө: XP_PER_METER XP = 1 метр (нэг зөв хариулт).

interface ClanRow {
  id: number;
  name: string;
  code: string;
  owner_id: number;
}

const CLAN_COLUMNS = 'c.id, c.name, c.code, c.owner_id';
const meters = (xp: number) => Math.floor(xp / XP_PER_METER);

/** Миний Уул; аль ч Ууланд байхгүй бол null. */
export async function clanOf(db: D1Database, userId: number): Promise<ClanRow | null> {
  return db
    .prepare(`SELECT ${CLAN_COLUMNS} FROM clan_members m JOIN clans c ON c.id = m.clan_id WHERE m.user_id = ?`)
    .bind(userId)
    .first<ClanRow>();
}

async function clanByCode(db: D1Database, input: string): Promise<ClanRow> {
  const code = normalizeClanCode(input);
  if (!code) throw new ApiError(400, 'BAD_REQUEST', `Уулын код ${GAME.CLAN.CODE_LENGTH} оронтой тоо байна`);
  const row = await db.prepare(`SELECT ${CLAN_COLUMNS} FROM clans c WHERE c.code = ?`).bind(code).first<ClanRow>();
  if (!row) throw new ApiError(404, 'CLAN_NOT_FOUND', 'Ийм кодтой Уул алга');
  return row;
}

async function myClanOrThrow(db: D1Database, userId: number): Promise<ClanRow> {
  const clan = await clanOf(db, userId);
  if (!clan) throw new ApiError(404, 'CLAN_NOT_FOUND', 'Чи одоогоор Ууланд нэгдээгүй байна');
  return clan;
}

function ownerOnly(clan: ClanRow, userId: number) {
  if (clan.owner_id !== userId) throw new ApiError(403, 'FORBIDDEN', 'Үүнийг зөвхөн Уулын эзэн хийнэ');
}

function cleanName(input: string): string {
  const name = normalizeClanName(input);
  if (!name) throw new ApiError(400, 'BAD_REQUEST', 'Уулын нэрээ бичнэ үү');
  return name;
}

type MemberRow = Pick<
  UserRow,
  'id' | 'username' | 'display_name' | 'grade' | 'xp' | 'streak' | 'last_streak_day' | 'shield_held' | 'shield_bought_day' | 'shield_used_day' | 'bear_look'
> & { profile_code: string | null; week_xp: number };

/** Уул ба гишүүд (энэ 7 хоногт хамгийн их өндөрсгөсөн нь эхэндээ). Гишүүдийн streak-ийг DB-д бичилгүй тооцно. */
async function loadClan(db: D1Database, clan: ClanRow, me: number, now: number): Promise<ClanDto> {
  const today = ubDay(now);
  const { results } = await db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.grade, u.xp, u.streak, u.last_streak_day, u.shield_held, u.shield_bought_day,
              u.shield_used_day, u.bear_look, u.profile_code,
              COALESCE((SELECT SUM(t.xp_awarded) FROM tasks t WHERE t.user_id = u.id AND t.day >= ? AND t.status = 'completed'), 0) AS week_xp
       FROM clan_members m JOIN users u ON u.id = m.user_id
       WHERE m.clan_id = ?
       ORDER BY m.joined_at, u.id`,
    )
    .bind(weekStart(today), clan.id)
    .all<MemberRow>();
  const members: ClanMemberDto[] = results
    .filter((r) => r.profile_code)
    .map((r) => ({
      code: r.profile_code!,
      username: r.username,
      name: r.display_name ?? r.username,
      grade: r.grade,
      level: levelFromXp(r.xp),
      streak: normalizeStreak(streakStateOf(r), today).state.streak,
      look: parseBearLook(r.bear_look),
      meters: meters(r.xp),
      weekMeters: meters(r.week_xp),
      owner: r.id === clan.owner_id,
      isMe: r.id === me,
    }))
    // sort тогтвортой: тэнцвэл эрт нэгдсэн нь эхэндээ
    .sort((a, b) => b.weekMeters - a.weekMeters || b.meters - a.meters);
  return {
    code: clan.code,
    name: clan.name,
    height: members.reduce((sum, m) => sum + m.meters, 0),
    weekHeight: members.reduce((sum, m) => sum + m.weekMeters, 0),
    maxMembers: GAME.CLAN.MAX_MEMBERS,
    isOwner: clan.owner_id === me,
    members,
  };
}

export async function myClan(db: D1Database, me: number, now = Date.now()): Promise<MyClanResponse> {
  const clan = await clanOf(db, me);
  return { clan: clan ? await loadClan(db, clan, me, now) : null };
}

/** Миний Уулын нэр (профайл дээр харагдана). */
export async function clanNameOf(db: D1Database, userId: number): Promise<string | null> {
  return (await clanOf(db, userId))?.name ?? null;
}

/** Уул байгуулна: үүсгэгч нь эзэн, анхны гишүүн. Нэр өгөөгүй бол "<нэрийн>" (Төгсбилэгийн). */
export async function createClan(db: D1Database, me: number, name: string | undefined, now = Date.now()): Promise<MyClanResponse> {
  if (await clanOf(db, me)) throw new ApiError(409, 'CLAN_MEMBER', 'Чи аль хэдийн Ууланд байна. Шинээр байгуулахын өмнө гарна уу');
  const user = await getUserRow(db, me);
  const clanName = name === undefined ? defaultClanName(user.display_name ?? user.username) : cleanName(name);
  // Гишүүд бие биеийнхээ профайлыг кодоор нь нээнэ: код байхгүй бол үүсгэнэ.
  await ensureProfileCode(db, me);
  for (let attempt = 0; ; attempt++) {
    const code = newClanCode();
    try {
      // Нэг batch = нэг transaction: аль хэдийн гишүүн болсон бол (зэрэг ирсэн хүсэлт) Уул ч үүсэхгүй.
      await db.batch([
        db
          .prepare('INSERT INTO clans (name, code, public_id, owner_id, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(clanName, code, newClanPublicId(), me, now),
        db.prepare('INSERT INTO clan_members (user_id, clan_id, joined_at) SELECT ?, id, ? FROM clans WHERE code = ?').bind(me, now, code),
      ]);
      break;
    } catch (e) {
      if (!isConstraintError(e, 'UNIQUE')) throw e;
      if (await clanOf(db, me)) throw new ApiError(409, 'CLAN_MEMBER', 'Чи аль хэдийн Ууланд байна');
      if (attempt >= 4) throw e;
    }
  }
  return myClan(db, me, now);
}

/** Кодоор нь Уулыг нэгдэхээс өмнө харна. */
export async function previewClan(db: D1Database, me: number, input: string): Promise<ClanPreviewResponse> {
  const clan = await clanByCode(db, input);
  const [stats, owner, looks, mine] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(u.xp / ?), 0) AS height FROM clan_members m JOIN users u ON u.id = m.user_id WHERE m.clan_id = ?')
      .bind(XP_PER_METER, clan.id)
      .first<{ n: number; height: number }>(),
    getUserRow(db, clan.owner_id),
    db
      .prepare('SELECT u.bear_look FROM clan_members m JOIN users u ON u.id = m.user_id WHERE m.clan_id = ? ORDER BY m.joined_at, u.id LIMIT 8')
      .bind(clan.id)
      .all<{ bear_look: string | null }>(),
    clanOf(db, me),
  ]);
  return {
    clan: {
      code: clan.code,
      name: clan.name,
      members: stats?.n ?? 0,
      maxMembers: GAME.CLAN.MAX_MEMBERS,
      height: stats?.height ?? 0,
      owner: owner.display_name ?? owner.username,
      looks: looks.results.map((r): BearLook => parseBearLook(r.bear_look)),
    },
    status: !mine ? 'none' : mine.id === clan.id ? 'member' : 'elsewhere',
  };
}

/** Кодоор Ууланд нэгдэнэ. Дүүрсэн (40) эсвэл өөр Ууланд байгаа бол 409. Аль хэдийн энэ Ууланд байвал зүгээр буцаана. */
export async function joinClan(db: D1Database, me: number, input: string, now = Date.now()): Promise<MyClanResponse> {
  const clan = await clanByCode(db, input);
  const current = await clanOf(db, me);
  if (current?.id === clan.id) return myClan(db, me, now);
  if (current) throw new ApiError(409, 'CLAN_MEMBER', 'Чи өөр Ууланд байна. Эхлээд тэндээсээ гарна уу');
  await ensureProfileCode(db, me);
  let added: D1Result;
  try {
    // Тоолох, нэмэх нэг statement-д: зэрэг нэгдсэн хүүхдүүд 40-өөс хэтрэхгүй.
    added = await db
      .prepare(
        `INSERT INTO clan_members (user_id, clan_id, joined_at)
         SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM clan_members WHERE clan_id = ?) < ?`,
      )
      .bind(me, clan.id, now, clan.id, GAME.CLAN.MAX_MEMBERS)
      .run();
  } catch (e) {
    // Зэрэг өөр Ууланд нэгдсэн
    if (isConstraintError(e, 'UNIQUE')) return joinClan(db, me, input, now);
    throw e;
  }
  if (!added.meta.changes) throw new ApiError(409, 'CLAN_FULL', `Энэ Ууланд ${GAME.CLAN.MAX_MEMBERS} сурагч нэгдсэн тул дүүрсэн байна`);
  return myClan(db, me, now);
}

/**
 * Уулаас гарна. Эзэн гарвал хамгийн эрт нэгдсэн гишүүн эзэн болно; сүүлчийн гишүүн гарвал Уул устна.
 * Нэг batch тул дундуур нь өөр хүн нэгдсэн ч Уул эзэнгүй үлдэхгүй.
 */
export async function leaveClan(db: D1Database, me: number): Promise<MyClanResponse> {
  const clan = await clanOf(db, me);
  if (!clan) return { clan: null };
  await db.batch([
    db.prepare('DELETE FROM clan_members WHERE user_id = ?').bind(me),
    db.prepare('DELETE FROM clans WHERE id = ? AND NOT EXISTS (SELECT 1 FROM clan_members WHERE clan_id = ?)').bind(clan.id, clan.id),
    db
      .prepare(
        `UPDATE clans SET owner_id = (SELECT user_id FROM clan_members WHERE clan_id = ? ORDER BY joined_at, user_id LIMIT 1)
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(clan.id, clan.id, me),
  ]);
  return { clan: null };
}

/** Нэр солих (эзэн). */
export async function renameClan(db: D1Database, me: number, name: string, now = Date.now()): Promise<MyClanResponse> {
  const clan = await myClanOrThrow(db, me);
  ownerOnly(clan, me);
  await db.prepare('UPDATE clans SET name = ? WHERE id = ?').bind(cleanName(name), clan.id).run();
  return myClan(db, me, now);
}

/** Урилгын кодыг солино (эзэн): хуучин кодоор нэгдэх боломжгүй болно, гишүүд хэвээр. */
export async function rotateClanCode(db: D1Database, me: number, now = Date.now()): Promise<MyClanResponse> {
  const clan = await myClanOrThrow(db, me);
  ownerOnly(clan, me);
  for (let attempt = 0; ; attempt++) {
    try {
      await db.prepare('UPDATE clans SET code = ? WHERE id = ?').bind(newClanCode(), clan.id).run();
      break;
    } catch (e) {
      if (attempt < 4 && isConstraintError(e, 'UNIQUE')) continue;
      throw e;
    }
  }
  return myClan(db, me, now);
}

/** Гишүүнийг профайлын кодоор нь хасна (эзэн; өөрийгөө биш). */
export async function removeMember(db: D1Database, me: number, profileCode: string, now = Date.now()): Promise<MyClanResponse> {
  const clan = await myClanOrThrow(db, me);
  ownerOnly(clan, me);
  const other = await profileOwner(db, profileCode);
  if (other === me) throw new ApiError(400, 'BAD_REQUEST', 'Уулаас гарах бол «Уулаас гарах»-ыг дарна уу');
  await db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').bind(clan.id, other).run();
  return myClan(db, me, now);
}
