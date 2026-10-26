import type { FriendDto, FriendsResponse, FriendStatus } from '../../../shared/types';
import { GAME } from '../config/game';
import { levelFromXp } from '../domain/level';
import { parseBearLook } from '../domain/profile';
import { normalizeStreak } from '../domain/streak';
import { ubDay } from '../domain/time';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';
import { ensureProfileCode, profileOwner } from './profileCodes';
import { streakStateOf, type UserRow } from './users';

// Найзууд: хүүхэд найзынхаа QR-ийг уншуулж (эсвэл кодыг бичиж) хүсэлт илгээнэ, нөгөө нь зөвшөөрсөн үед найз болно.

interface LinkRow {
  from_id: number;
  to_id: number;
  status: 'pending' | 'accepted';
}

async function linkBetween(db: D1Database, a: number, b: number): Promise<LinkRow | null> {
  return db
    .prepare('SELECT from_id, to_id, status FROM friendships WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)')
    .bind(a, b, b, a)
    .first<LinkRow>();
}

const statusOf = (link: LinkRow | null, me: number): FriendStatus =>
  !link ? 'none' : link.status === 'accepted' ? 'friends' : link.from_id === me ? 'outgoing' : 'incoming';

export async function friendStatus(db: D1Database, me: number, other: number): Promise<FriendStatus> {
  return me === other ? 'none' : statusOf(await linkBetween(db, me, other), me);
}

/**
 * Кодоор найзын хүсэлт илгээнэ. Тэр надад аль хэдийн илгээсэн бол зөвшөөрнө: QR-аа харилцан уншуулсан хоёр
 * хүүхэд шууд найз болно.
 */
export async function addFriend(db: D1Database, me: number, code: string, now = Date.now()): Promise<FriendStatus> {
  const other = await profileOwner(db, code);
  if (other === me) throw new ApiError(400, 'BAD_REQUEST', 'Өөрийгөө найзаар нэмэх боломжгүй');
  const link = await linkBetween(db, me, other);
  if (link?.status === 'pending' && link.from_id === other) {
    await db
      .prepare(`UPDATE friendships SET status = 'accepted', accepted_at = ? WHERE from_id = ? AND to_id = ? AND status = 'pending'`)
      .bind(now, other, me)
      .run();
    return 'friends';
  }
  if (link) return statusOf(link, me);

  const total = await db.prepare('SELECT COUNT(*) AS n FROM friendships WHERE from_id = ? OR to_id = ?').bind(me, me).first<{ n: number }>();
  if ((total?.n ?? 0) >= GAME.FRIENDS.MAX) throw new ApiError(409, 'FRIEND_LIMIT', `Хамгийн ихдээ ${GAME.FRIENDS.MAX} найз`);
  // Хүсэлт хүлээн авагч илгээгчийн профайлыг нээж харна: илгээгч кодгүй бол үүсгэнэ.
  await ensureProfileCode(db, me);
  try {
    await db.prepare(`INSERT INTO friendships (from_id, to_id, status, created_at) VALUES (?, ?, 'pending', ?)`).bind(me, other, now).run();
  } catch (e) {
    // Тэр ч зэрэг надад хүсэлт илгээсэн (idx_friendships_pair): одоо байгаа мөрөөр нь дахин шийднэ.
    if (isConstraintError(e, 'UNIQUE')) return addFriend(db, me, code, now);
    throw e;
  }
  return 'outgoing';
}

/** Хүсэлтийг татгалзах, илгээснээ цуцлах, найзаас хасах: аль ч тохиолдолд холбоо устна. */
export async function removeFriend(db: D1Database, me: number, code: string): Promise<FriendStatus> {
  const other = await profileOwner(db, code);
  await db.prepare('DELETE FROM friendships WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)').bind(me, other, other, me).run();
  return 'none';
}

type FriendRow = Pick<UserRow, 'username' | 'display_name' | 'grade' | 'xp' | 'streak' | 'last_streak_day' | 'shield_held' | 'shield_bought_day' | 'shield_used_day' | 'bear_look'> &
  LinkRow & { profile_code: string | null };

/** Найзууд ба хүсэлтүүд, шинэ нь эхэндээ. Найзын streak-ийг DB-д бичилгүй тооцно. */
export async function listFriends(db: D1Database, me: number, now = Date.now()): Promise<FriendsResponse> {
  const { results } = await db
    .prepare(
      `SELECT f.from_id, f.to_id, f.status, u.username, u.display_name, u.grade, u.xp, u.streak, u.last_streak_day, u.shield_held,
              u.shield_bought_day, u.shield_used_day, u.bear_look, u.profile_code
       FROM friendships f JOIN users u ON u.id = CASE WHEN f.from_id = ? THEN f.to_id ELSE f.from_id END
       WHERE f.from_id = ? OR f.to_id = ?
       ORDER BY COALESCE(f.accepted_at, f.created_at) DESC`,
    )
    .bind(me, me, me)
    .all<FriendRow>();
  const today = ubDay(now);
  const out: FriendsResponse = { friends: [], incoming: [], outgoing: [] };
  for (const r of results) {
    if (!r.profile_code) continue;
    const dto: FriendDto = {
      code: r.profile_code,
      username: r.username,
      name: r.display_name ?? r.username,
      grade: r.grade,
      level: levelFromXp(r.xp),
      streak: normalizeStreak(streakStateOf(r), today).state.streak,
      look: parseBearLook(r.bear_look),
    };
    const status = statusOf(r, me);
    if (status === 'friends') out.friends.push(dto);
    else if (status === 'incoming') out.incoming.push(dto);
    else out.outgoing.push(dto);
  }
  return out;
}
