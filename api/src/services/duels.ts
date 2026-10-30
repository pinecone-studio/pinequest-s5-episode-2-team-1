import type { DuelMemberDto, DuelPlayerDto, DuelSummary, DuelTeam, DuelVisibility, LobbyResponse, Subject } from '../../../shared/types';
import { DUEL_SUBJECTS, GAME } from '../config/game';
import type { DuelPlayerInfo, DuelQuestion, Settlement } from '../duel/engine';
import { newDuelCode, normalizeDuelCode } from '../domain/duelCode';
import { levelFromXp } from '../domain/level';
import { parseBearLook } from '../domain/profile';
import { maxStake, stakeError } from '../domain/stake';
import type { Bindings } from '../env';
import { isConstraintError, newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { avatarLook, type CatalogItem, getCatalog, parseEquipped } from './items';
import { getUserRow, getUserRows, type UserRow } from './users';

interface DuelRow {
  id: number;
  tier: number;
  subject: Subject;
  stake: number;
  creator_id: number;
  opponent_id: number | null;
  status: 'open' | 'accepted' | 'finished' | 'cancelled';
  visibility: DuelVisibility;
  code: string | null;
  team_size: number;
  winner_team: DuelTeam | null;
  creator_seen_at: number | null;
  winner_id: number | null;
  end_reason: string | null;
  creator_score: number | null;
  opponent_score: number | null;
  created_at: number;
  accepted_at: number | null;
}

interface SummaryRow extends DuelRow {
  c_username: string;
  c_name: string;
  c_xp: number;
  c_equipped: string;
  c_look: string | null;
  o_username: string | null;
  o_name: string | null;
  o_xp: number | null;
  o_equipped: string | null;
  o_look: string | null;
}

interface MemberRow {
  duel_id: number;
  team: DuelTeam;
  id: number;
  username: string;
  name: string;
  xp: number;
  equipped: string;
  bear_look: string | null;
}

/** Тооцоо хийх оролцогч. */
export interface DuelParty {
  id: number;
  team: DuelTeam;
}

const SUMMARY_SELECT = `
  SELECT d.*, c.username AS c_username, COALESCE(c.display_name, c.username) AS c_name, c.xp AS c_xp, c.equipped AS c_equipped,
         c.bear_look AS c_look,
         o.username AS o_username, COALESCE(o.display_name, o.username) AS o_name, o.xp AS o_xp, o.equipped AS o_equipped,
         o.bear_look AS o_look
  FROM duels d
  JOIN users c ON c.id = d.creator_id
  LEFT JOIN users o ON o.id = d.opponent_id`;

const MEMBER_SELECT = `
  SELECT m.duel_id, m.team, u.id, u.username, COALESCE(u.display_name, u.username) AS name, u.xp, u.equipped, u.bear_look
  FROM duel_members m JOIN users u ON u.id = m.user_id`;

/** Хэрэглэгч (?) багийн тулааны гишүүн: d.id-тай мөрөнд (?) user_id-г бичнэ. */
const IS_MEMBER = 'EXISTS (SELECT 1 FROM duel_members m WHERE m.duel_id = d.id AND m.user_id = ?)';

/** Хэрэглэгч (?, ?, ?, ?) нээлттэй сорилттой, багт бүртгүүлсэн эсвэл тулаан хийж байна. */
const BUSY_SQL = `SELECT 1 FROM duels WHERE (creator_id = ? AND status = 'open')
  OR (status = 'accepted' AND (creator_id = ? OR opponent_id = ?))
  UNION ALL SELECT 1 FROM duel_members m JOIN duels d ON d.id = m.duel_id WHERE m.user_id = ? AND d.status IN ('open', 'accepted')`;

/** Хэрэглэгч (?, ?, ?) яг одоо тулаан хийж байна. */
const PLAYING_SQL = `SELECT d.id FROM duels d WHERE d.status = 'accepted' AND (d.creator_id = ? OR d.opponent_id = ? OR ${IS_MEMBER}) LIMIT 1`;

export function duelRoomName(duelId: number): string {
  return `duel-${duelId}`;
}

function player(
  id: number,
  username: string,
  name: string,
  xp: number,
  equipped: string,
  look: string | null,
  catalog: Map<string, CatalogItem>,
): DuelPlayerDto {
  return { id, username, name, level: levelFromXp(xp), avatar: avatarLook(parseEquipped(equipped), catalog), look: parseBearLook(look) };
}

async function loadMembers(db: D1Database, duelIds: number[]): Promise<Map<number, MemberRow[]>> {
  const byDuel = new Map<number, MemberRow[]>();
  if (!duelIds.length) return byDuel;
  const { results } = await db
    .prepare(`${MEMBER_SELECT} WHERE m.duel_id IN (SELECT value FROM json_each(?)) ORDER BY m.joined_at, m.user_id`)
    .bind(JSON.stringify(duelIds))
    .all<MemberRow>();
  for (const r of results) byDuel.set(r.duel_id, [...(byDuel.get(r.duel_id) ?? []), r]);
  return byDuel;
}

/** `viewerId` = хэн харж байгаа: урилгын кодыг зөвхөн оролцогчдод харуулна. */
function toSummary(r: SummaryRow, catalog: Map<string, CatalogItem>, viewerId: number, teamRows: MemberRow[] = []): DuelSummary {
  const creator = player(r.creator_id, r.c_username, r.c_name, r.c_xp, r.c_equipped, r.c_look, catalog);
  const opponent =
    r.opponent_id && r.o_username !== null
      ? player(r.opponent_id, r.o_username, r.o_name ?? r.o_username, r.o_xp ?? 0, r.o_equipped ?? '{}', r.o_look, catalog)
      : null;
  const teamSize = r.team_size ?? 1;
  const members: DuelMemberDto[] =
    teamSize > 1
      ? teamRows.map((m) => ({ ...player(m.id, m.username, m.name, m.xp, m.equipped, m.bear_look, catalog), team: m.team }))
      : [{ ...creator, team: 'a' as const }, ...(opponent ? [{ ...opponent, team: 'b' as const }] : [])];
  const myTeam = members.find((m) => m.id === viewerId)?.team ?? null;
  return {
    id: r.id,
    subject: r.subject,
    stake: r.stake,
    status: r.status,
    visibility: r.visibility,
    teamSize,
    members,
    myTeam,
    code: myTeam !== null && r.status === 'open' ? r.code : null,
    createdAt: r.created_at,
    creator,
    opponent,
    winnerId: r.winner_id,
    endReason: r.end_reason,
    creatorScore: r.creator_score,
    opponentScore: r.opponent_score,
  };
}

async function toSummaries(db: D1Database, rows: SummaryRow[], viewerId: number): Promise<DuelSummary[]> {
  const catalog = await getCatalog(db);
  const members = await loadMembers(
    db,
    rows.filter((r) => r.team_size > 1).map((r) => r.id),
  );
  return rows.map((r) => toSummary(r, catalog, viewerId, members.get(r.id)));
}

export async function getDuelSummary(db: D1Database, duelId: number, viewerId: number): Promise<DuelSummary> {
  const row = await db.prepare(`${SUMMARY_SELECT} WHERE d.id = ?`).bind(duelId).first<SummaryRow>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Тулаан олдсонгүй');
  return (await toSummaries(db, [row], viewerId))[0];
}

/** Тулааны бүх оролцогч багаар нь (1 vs 1: үүсгэгч 'a', өрсөлдөгч 'b'). */
async function partiesOf(db: D1Database, duel: Pick<DuelRow, 'id' | 'team_size' | 'creator_id' | 'opponent_id'>): Promise<DuelParty[]> {
  if (duel.team_size <= 1) {
    return [{ id: duel.creator_id, team: 'a' }, ...(duel.opponent_id ? [{ id: duel.opponent_id, team: 'b' as const }] : [])];
  }
  const { results } = await db
    .prepare('SELECT user_id AS id, team FROM duel_members WHERE duel_id = ? ORDER BY joined_at, user_id')
    .bind(duel.id)
    .all<DuelParty>();
  return results;
}

/** WebSocket: тухайн хэрэглэгч энэ тулааны оролцогч мөн эсэх. */
export async function isParticipant(db: D1Database, duelId: number, userId: number): Promise<{ status: string } | null> {
  return db
    .prepare(`SELECT d.status FROM duels d WHERE d.id = ? AND (d.creator_id = ? OR d.opponent_id = ? OR ${IS_MEMBER})`)
    .bind(duelId, userId, userId, userId)
    .first<{ status: string }>();
}

/**
 * Тулааны эцсийн тооцоо (нэг batch): ялсан багийн гишүүн бүрт хоёр бооцоо, эсвэл бүгдэд нь буцаалт.
 * `status = 'accepted'` → шилжилт зөвхөн нэг удаа амжилттай болох тул дахин дуудахад аюулгүй.
 */
export async function settleDuel(
  db: D1Database,
  duel: { id: number; stake: number; teamSize: number; players: DuelParty[] },
  settlement: Settlement,
  reason: string,
  scores: Record<string, number>,
  now = Date.now(),
): Promise<Record<number, number>> {
  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM duels WHERE id = ? AND tx = ?)';
  const status = reason === 'no_show' || reason === 'stale' ? 'cancelled' : 'finished';
  const teamOf = new Map(duel.players.map((p) => [p.id, p.team]));
  const winnerTeam = settlement.kind === 'win' ? (teamOf.get(settlement.winners[0]) ?? null) : null;
  const winnerId = settlement.kind === 'win' && duel.teamSize <= 1 ? settlement.winners[0] : null;
  const teamScore = (t: DuelTeam) => duel.players.filter((p) => p.team === t).reduce((sum, p) => sum + (scores[String(p.id)] ?? 0), 0);
  const ledger = db.prepare(
    `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
     SELECT ?, ?, ?, 'duel', ?, ? WHERE ${guard}`,
  );
  const credit = db.prepare(`UPDATE users SET points = points + ? WHERE id = ? AND ${guard}`);

  const statements = [
    db
      .prepare(
        `UPDATE duels SET status = ?, winner_id = ?, winner_team = ?, creator_score = ?, opponent_score = ?, end_reason = ?, finished_at = ?, tx = ?
         WHERE id = ? AND status = 'accepted'`,
      )
      .bind(status, winnerId, winnerTeam, teamScore('a'), teamScore('b'), reason, now, tx, duel.id),
  ];
  if (duel.teamSize > 1) {
    statements.push(
      db
        .prepare(
          `UPDATE duel_members SET score = COALESCE((SELECT value FROM json_each(?) WHERE key = CAST(user_id AS TEXT)), 0)
           WHERE duel_id = ? AND ${guard}`,
        )
        .bind(JSON.stringify(scores), duel.id, duel.id, tx),
    );
  }
  if (settlement.kind === 'win') {
    for (const uid of settlement.winners) {
      statements.push(credit.bind(duel.stake * 2, uid, duel.id, tx), ledger.bind(uid, duel.stake * 2, 'duel_payout', String(duel.id), now, duel.id, tx));
    }
  } else {
    for (const { id: uid } of duel.players) {
      statements.push(credit.bind(duel.stake, uid, duel.id, tx), ledger.bind(uid, duel.stake, 'duel_refund', String(duel.id), now, duel.id, tx));
    }
  }
  await db.batch(statements);

  const { results } = await db
    .prepare('SELECT id, points FROM users WHERE id IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(duel.players.map((p) => p.id)))
    .all<{ id: number; points: number }>();
  return Object.fromEntries(results.map((r) => [r.id, r.points]));
}

/**
 * DuelRoom гацсан (жишээ нь dev сервер унасан) тулааныг цуцалж бооцоог буцаана. Үүсгэгч нь удаан алга
 * болсон нээлттэй сорилтыг ч хаана (бооцоо хараахан хасагдаагүй тул оноо хөдлөхгүй).
 */
async function sweepStale(db: D1Database, now: number) {
  await db
    .prepare(
      `UPDATE duels SET status = 'cancelled', end_reason = 'expired', finished_at = ?
       WHERE status = 'open' AND COALESCE(creator_seen_at, created_at) < ?`,
    )
    .bind(now, now - GAME.DUEL.OPEN_TTL_MS)
    .run();
  const { results } = await db
    .prepare(`SELECT id, stake, creator_id, opponent_id, team_size FROM duels WHERE status = 'accepted' AND accepted_at < ?`)
    .bind(now - GAME.DUEL.STALE_ACCEPTED_MS)
    .all<{ id: number; stake: number; creator_id: number; opponent_id: number | null; team_size: number }>();
  for (const d of results) {
    const players = await partiesOf(db, d);
    await settleDuel(db, { id: d.id, stake: d.stake, teamSize: d.team_size, players }, { kind: 'refund' }, 'stale', {}, now);
  }
}

/**
 * Лобби (3 сек тутам poll). Үүсгэгчийн poll нь "хүлээж байна" гэсэн тэмдэг болно: бусдын лобби дээр
 * зөвхөн үүсгэгч нь сүүлийн LOBBY_PRESENCE_MS-д лобби-гоо нээсэн сорилт гарна (хүлээн авбал шууд эхэлнэ).
 */
export async function lobby(db: D1Database, userId: number, now = Date.now()): Promise<LobbyResponse> {
  await sweepStale(db, now);
  await db.prepare(`UPDATE duels SET creator_seen_at = ? WHERE creator_id = ? AND status = 'open'`).bind(now, userId).run();
  const user = await getUserRow(db, userId);
  const { results: open } = await db
    .prepare(
      `${SUMMARY_SELECT}
       WHERE d.status = 'open' AND d.visibility = 'public' AND c.grade = ? AND c.is_judge = ? AND d.creator_id != ? AND d.creator_seen_at >= ?
         AND NOT ${IS_MEMBER} AND d.subject IN (SELECT value FROM json_each(?))
       ORDER BY d.created_at DESC LIMIT 30`,
    )
    .bind(user.grade, user.is_judge, userId, now - GAME.DUEL.LOBBY_PRESENCE_MS, userId, JSON.stringify(DUEL_SUBJECTS))
    .all<SummaryRow>();
  const mine = await db
    .prepare(
      `${SUMMARY_SELECT} WHERE (d.creator_id = ? OR d.opponent_id = ? OR ${IS_MEMBER}) AND d.status IN ('open', 'accepted')
       ORDER BY d.id DESC LIMIT 1`,
    )
    .bind(userId, userId, userId)
    .first<SummaryRow>();
  const summaries = await toSummaries(db, mine ? [...open, mine] : open, userId);
  return {
    open: summaries.slice(0, open.length),
    mine: mine ? summaries[open.length] : null,
    maxStake: maxStake(user.points),
    points: user.points,
  };
}

export async function createChallenge(
  db: D1Database,
  userId: number,
  subject: Subject,
  stake: number,
  visibility: DuelVisibility = 'public',
  teamSize = 1,
  now = Date.now(),
): Promise<DuelSummary> {
  await sweepStale(db, now);
  const user = await getUserRow(db, userId);
  const err = stakeError(stake, user.points);
  if (err) throw new ApiError(400, err, `Бооцоо 1–${maxStake(user.points)} боргоцой байна`);
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > GAME.DUEL.TEAM_SIZE_MAX) {
    throw new ApiError(400, 'BAD_REQUEST', `Багийн хэмжээ 1–${GAME.DUEL.TEAM_SIZE_MAX}`);
  }
  // "Завгүй эсэх"-ийг INSERT дотор шалгана: зэрэг хоёр хүсэлт хоёр сорилт үүсгэхгүй.
  // Урилгын код нээлттэй сорилтуудын дунд давтагдвал (UNIQUE index) шинэ кодоор дахин оролдоно.
  const insert = db.prepare(
    `INSERT INTO duels (tier, subject, stake, creator_id, status, visibility, code, team_size, creator_seen_at, created_at)
     SELECT ?, ?, ?, ?, 'open', ?, ?, ?, ?, ? WHERE NOT EXISTS (${BUSY_SQL})
     RETURNING id`,
  );
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await insert
        .bind(user.tier, subject, stake, userId, visibility, newDuelCode(), teamSize, now, now, userId, userId, userId, userId)
        .first<{ id: number }>();
      if (!row) throw new ApiError(409, 'DUEL_EXISTS', 'Нээлттэй тулаан байна');
      if (teamSize > 1) {
        await db
          .prepare(`INSERT INTO duel_members (duel_id, user_id, team, joined_at) VALUES (?, ?, 'a', ?)`)
          .bind(row.id, userId, now)
          .run()
          .catch(async (e: unknown) => {
            await cancelChallenge(db, userId, row.id, now).catch(() => undefined);
            throw e;
          });
      }
      return getDuelSummary(db, row.id, userId);
    } catch (e) {
      if (attempt < 4 && isConstraintError(e, 'UNIQUE')) continue;
      throw e;
    }
  }
}

export async function cancelChallenge(db: D1Database, userId: number, duelId: number, now = Date.now()): Promise<void> {
  const r = await db
    .prepare(`UPDATE duels SET status = 'cancelled', end_reason = 'cancelled', finished_at = ? WHERE id = ? AND creator_id = ? AND status = 'open'`)
    .bind(now, duelId, userId)
    .run();
  if (!r.meta.changes) throw new ApiError(409, 'DUEL_NOT_OPEN', 'Сорилт нээлттэй биш байна');
}

/** Лобби дээрх сорилтод нэгдэнэ. Найзын (private) сорилтод зөвхөн кодоор орно. */
export async function acceptChallenge(env: Bindings, userId: number, duelId: number, team?: DuelTeam, now = Date.now()): Promise<DuelSummary> {
  await sweepStale(env.DB, now);
  const duel = await env.DB.prepare('SELECT * FROM duels WHERE id = ?').bind(duelId).first<DuelRow>();
  if (!duel || (duel.visibility === 'private' && duel.creator_id !== userId)) throw new ApiError(404, 'NOT_FOUND', 'Сорилт олдсонгүй');
  return duel.team_size > 1 ? joinTeam(env, userId, duel, team, now) : startDuel(env, userId, duel, now);
}

/** Урилгын кодоор (public ч бай, private ч бай) нээлттэй сорилтод нэгдэнэ. */
export async function joinByCode(env: Bindings, userId: number, input: string, team?: DuelTeam, now = Date.now()): Promise<DuelSummary> {
  const code = normalizeDuelCode(input);
  if (!code) throw new ApiError(400, 'BAD_REQUEST', `Код ${GAME.DUEL.CODE_LENGTH} оронтой тоо байна`);
  await sweepStale(env.DB, now);
  const duel = await env.DB.prepare(`SELECT * FROM duels WHERE code = ? AND status = 'open'`).bind(code).first<DuelRow>();
  if (!duel) throw new ApiError(404, 'CODE_NOT_FOUND', 'Ийм кодтой нээлттэй тулаан алга');
  return duel.team_size > 1 ? joinTeam(env, userId, duel, team, now) : startDuel(env, userId, duel, now);
}

/** Нээлттэй багийн тулаанд өөр баг руу шилжинэ (тэр баг дүүрээгүй бол). */
export async function switchTeam(db: D1Database, userId: number, duelId: number, team: DuelTeam): Promise<DuelSummary> {
  const r = await db
    .prepare(
      `UPDATE duel_members SET team = ?
       WHERE duel_id = ? AND user_id = ? AND team != ?
         AND EXISTS (SELECT 1 FROM duels WHERE id = ? AND status = 'open')
         AND (SELECT COUNT(*) FROM duel_members WHERE duel_id = ? AND team = ?) < (SELECT team_size FROM duels WHERE id = ?)`,
    )
    .bind(team, duelId, userId, team, duelId, duelId, team, duelId)
    .run();
  if (!r.meta.changes) {
    const member = await db.prepare('SELECT team FROM duel_members WHERE duel_id = ? AND user_id = ?').bind(duelId, userId).first<{ team: DuelTeam }>();
    if (!member) throw new ApiError(404, 'NOT_FOUND', 'Та энэ тулааны гишүүн биш');
    if (member.team !== team) throw new ApiError(409, 'TEAM_FULL', 'Энэ баг дүүрсэн');
  }
  return getDuelSummary(db, duelId, userId);
}

/** Нээлттэй багийн тулаанаас гарна (үүсгэгч нь цуцална). */
export async function leaveTeam(db: D1Database, userId: number, duelId: number): Promise<void> {
  const r = await db
    .prepare(
      `DELETE FROM duel_members WHERE duel_id = ? AND user_id = ?
         AND EXISTS (SELECT 1 FROM duels WHERE id = ? AND status = 'open' AND creator_id != ?)`,
    )
    .bind(duelId, userId, duelId, userId)
    .run();
  if (!r.meta.changes) throw new ApiError(409, 'DUEL_NOT_OPEN', 'Багаас гарах боломжгүй');
}

/** Ижил ангийнхан л тулална, бооцоо нь онооны 20%-д багтана, өөр тулаан хийж байгаа хүн орохгүй. */
async function checkCanJoin(db: D1Database, userId: number, duel: DuelRow): Promise<UserRow> {
  if (duel.creator_id === userId) throw new ApiError(409, 'OWN_DUEL', 'Өөрийн сорилт');
  if (duel.status !== 'open') throw new ApiError(409, duel.status === 'accepted' ? 'DUEL_TAKEN' : 'DUEL_NOT_OPEN', 'Сорилт хаагдсан');
  // Тулаан зөвхөн DUEL_SUBJECTS-ээр: дүрэм гарахаас өмнө үүссэн бусад хичээлийн сорилтод нэгдэхгүй.
  if (!(DUEL_SUBJECTS as readonly string[]).includes(duel.subject)) throw new ApiError(409, 'DUEL_NOT_OPEN', 'Энэ хичээлээр тулаан хийхгүй');
  const joiner = await getUserRow(db, userId);
  const creator = await getUserRow(db, duel.creator_id);
  if (joiner.grade !== creator.grade) throw new ApiError(403, 'WRONG_GRADE', 'Өөр ангийн сорилт');
  // Шүүгч бүр 5000 боргоцойтой тул хүүхэдтэй бооцоотой тулалдвал санаатай ялагдаж боргоцой шилжүүлж болно.
  if (joiner.is_judge !== creator.is_judge) throw new ApiError(403, 'JUDGE_DUEL', 'Шүүгч зөвхөн шүүгчтэй тулалдана');
  if (await db.prepare(PLAYING_SQL).bind(userId, userId, userId).first()) throw new ApiError(409, 'DUEL_EXISTS', 'Явагдаж буй тулаан байна');
  if (stakeError(duel.stake, joiner.points)) throw new ApiError(400, 'STAKE_TOO_HIGH', 'Таны боргоцойн 20%-иас их бооцоо');
  return joiner;
}

/**
 * Багийн тулаанд нэгдэнэ: `team` өгөөгүй бол цөөн хүнтэй баг руу. Нэг хүн нэг л тулаанд: өөрийн нээлттэй
 * сорилт цуцлагдаж, өөр багт бүртгүүлсэн бол тэндээсээ гарна. Хоёр баг дүүрмэгц тулаан эхэлнэ.
 */
async function joinTeam(env: Bindings, userId: number, duel: DuelRow, team: DuelTeam | undefined, now: number): Promise<DuelSummary> {
  const db = env.DB;
  const already = await db.prepare('SELECT team FROM duel_members WHERE duel_id = ? AND user_id = ?').bind(duel.id, userId).first<{ team: DuelTeam }>();
  if (already) return team && team !== already.team ? switchTeam(db, userId, duel.id, team) : getDuelSummary(db, duel.id, userId);
  await checkCanJoin(db, userId, duel);

  const counts = await db
    .prepare(`SELECT team, COUNT(*) AS n FROM duel_members WHERE duel_id = ? GROUP BY team`)
    .bind(duel.id)
    .all<{ team: DuelTeam; n: number }>();
  const size = (t: DuelTeam) => counts.results.find((c) => c.team === t)?.n ?? 0;
  const target: DuelTeam = team ?? (size('a') <= size('b') ? 'a' : 'b');

  // Суудал авч чадсан (INSERT амжилттай) үед л хуучин сорилт, багаа орхино.
  const joined = 'EXISTS (SELECT 1 FROM duel_members WHERE duel_id = ? AND user_id = ?)';
  const res = await db.batch([
    db
      .prepare(
        `INSERT INTO duel_members (duel_id, user_id, team, joined_at)
         SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM duels WHERE id = ? AND status = 'open')
           AND (SELECT COUNT(*) FROM duel_members WHERE duel_id = ? AND team = ?) < ?`,
      )
      .bind(duel.id, userId, target, now, duel.id, duel.id, target, duel.team_size),
    db
      .prepare(
        `UPDATE duels SET status = 'cancelled', end_reason = 'cancelled', finished_at = ?
         WHERE creator_id = ? AND status = 'open' AND id != ? AND ${joined}`,
      )
      .bind(now, userId, duel.id, duel.id, userId),
    db
      .prepare(
        `DELETE FROM duel_members WHERE user_id = ? AND duel_id != ? AND duel_id IN (SELECT id FROM duels WHERE status = 'open') AND ${joined}`,
      )
      .bind(userId, duel.id, duel.id, userId),
  ]);
  if (!res[0].meta.changes) {
    const current = await db.prepare('SELECT status FROM duels WHERE id = ?').bind(duel.id).first<{ status: string }>();
    if (current?.status !== 'open') throw new ApiError(409, 'DUEL_TAKEN', 'Тулаан эхэлчихлээ');
    throw new ApiError(409, 'TEAM_FULL', 'Энэ баг дүүрсэн');
  }
  // Суудал аль хэдийн авсан: эхлүүлж чадаагүй ч нэгдэлт хүчинтэй, тулааны бодит төлөвийг буцаана.
  await startTeamDuelIfFull(env, duel, now).catch((e) => {
    if (!(e instanceof ApiError)) throw e;
    console.warn('[duel] team start failed', duel.id, e.code);
  });
  return getDuelSummary(db, duel.id, userId);
}

type PickedQuestion = { id: number; prompt: string; options: string; correct_index: number; explanation: string };

const toDuelQuestions = (picked: PickedQuestion[]): DuelQuestion[] =>
  picked.map((q) => ({ id: q.id, prompt: q.prompt, options: JSON.parse(q.options) as string[], correctIndex: q.correct_index, explanation: q.explanation }));

async function playerInfo(db: D1Database, users: UserRow[], teamOf: (id: number) => DuelTeam): Promise<DuelPlayerInfo[]> {
  const catalog = await getCatalog(db);
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.display_name ?? u.username,
    avatar: avatarLook(parseEquipped(u.equipped), catalog),
    look: parseBearLook(u.bear_look),
    team: teamOf(u.id),
  }));
}

/**
 * Нээлттэй багийн тулааны гишүүдээс (ids = JSON) өөр тулаан хийж буйг нь хасна. Үүсгэгч өөр тулаанд орсон бол
 * тулааныг цуцална. Тулаан аль хэдийн эхэлсэн бол юу ч хийхгүй.
 */
async function dropPlayingMembers(db: D1Database, duel: DuelRow, ids: string, now: number): Promise<void> {
  const { results: playing } = await db
    .prepare(
      `SELECT j.value AS id FROM json_each(?) j WHERE EXISTS (SELECT 1 FROM duels d WHERE d.status = 'accepted' AND d.id != ?
         AND (d.creator_id = j.value OR d.opponent_id = j.value OR EXISTS (SELECT 1 FROM duel_members m WHERE m.duel_id = d.id AND m.user_id = j.value)))`,
    )
    .bind(ids, duel.id)
    .all<{ id: number }>();
  if (!playing.length) return;
  if (playing.some((p) => p.id === duel.creator_id)) {
    await cancelChallenge(db, duel.creator_id, duel.id, now).catch(() => undefined);
    return;
  }
  await db
    .prepare(
      `DELETE FROM duel_members WHERE duel_id = ? AND user_id IN (SELECT value FROM json_each(?))
         AND EXISTS (SELECT 1 FROM duels WHERE id = ? AND status = 'open')`,
    )
    .bind(duel.id, JSON.stringify(playing.map((p) => p.id)), duel.id)
    .run();
}

/**
 * Хоёр баг дүүрсэн бол бүх гишүүний бооцоог нэг batch-аар түр хасаж (оноо хүрэлцэхгүй бол CHECK → rollback),
 * асуулт сонгож DuelRoom-ыг эхлүүлнэ. Боргоцой нь буурч 20%-ийн хязгаар зөрчигдсөн гишүүнийг багаас хасна.
 */
async function startTeamDuelIfFull(env: Bindings, duel: DuelRow, now: number, retried = false): Promise<void> {
  const db = env.DB;
  const parties = await partiesOf(db, duel);
  const countOf = (t: DuelTeam) => parties.filter((p) => p.team === t).length;
  if (countOf('a') < duel.team_size || countOf('b') < duel.team_size) return;

  const users = await getUserRows(db, parties.map((p) => p.id));
  const broke = users.filter((u) => stakeError(duel.stake, u.points));
  if (broke.length) {
    if (broke.some((u) => u.id === duel.creator_id)) {
      await cancelChallenge(db, duel.creator_id, duel.id, now).catch(() => undefined);
      throw new ApiError(409, 'OPPONENT_STAKE_TOO_HIGH', 'Үүсгэгчийн боргоцойн 20%-иас хэтэрсэн');
    }
    await db
      .prepare('DELETE FROM duel_members WHERE duel_id = ? AND user_id IN (SELECT value FROM json_each(?))')
      .bind(duel.id, JSON.stringify(broke.map((u) => u.id)))
      .run();
    return;
  }

  const ids = JSON.stringify(parties.map((p) => p.id));
  const grade = users[0].grade;
  const { results: picked } = await db
    .prepare(
      `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation FROM questions q
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND (q.book_ref IS NULL OR q.grade = ?)
       ORDER BY (SELECT COUNT(*) FROM seen_questions s WHERE s.question_id = q.id AND s.user_id IN (SELECT value FROM json_each(?))), RANDOM()
       LIMIT ?`,
    )
    .bind(duel.tier, duel.subject, grade, ids, GAME.DUEL.TEAM_QUESTIONS)
    .all<PickedQuestion>();
  if (picked.length < GAME.DUEL.TEAM_QUESTIONS) {
    // Дүүрсэн багийг эхлүүлэх өөр оролдлого гарахгүй тул нээлттэй үлдээвэл гацна.
    await cancelChallenge(db, duel.creator_id, duel.id, now).catch(() => undefined);
    throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй');
  }
  const questionIds = JSON.stringify(picked.map((q) => q.id));

  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM duels WHERE id = ? AND tx = ?)';
  const inIds = 'IN (SELECT value FROM json_each(?))';
  try {
    const res = await db.batch([
      // Гишүүдийн хэн нь ч өөр тулаан хийгээгүй байхыг энд дахин шалгана.
      db
        .prepare(
          `UPDATE duels SET status = 'accepted', accepted_at = ?, question_ids = ?, tx = ?
           WHERE id = ? AND status = 'open'
             AND NOT EXISTS (SELECT 1 FROM duels d2 WHERE d2.status = 'accepted' AND (d2.creator_id ${inIds} OR d2.opponent_id ${inIds}))
             AND NOT EXISTS (SELECT 1 FROM duel_members m JOIN duels d3 ON d3.id = m.duel_id WHERE d3.status = 'accepted' AND m.user_id ${inIds})`,
        )
        .bind(now, questionIds, tx, duel.id, ids, ids, ids),
      db.prepare(`UPDATE users SET points = points - ? WHERE id ${inIds} AND ${guard}`).bind(duel.stake, ids, duel.id, tx),
      db
        .prepare(
          `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
           SELECT id, ?, 'duel_stake', 'duel', ?, ? FROM users WHERE id ${inIds} AND ${guard}`,
        )
        .bind(-duel.stake, String(duel.id), now, ids, duel.id, tx),
      db
        .prepare(
          `INSERT INTO seen_questions (user_id, question_id, seen_at)
           SELECT u.value, j.value, ? FROM json_each(?) u, json_each(?) j WHERE ${guard}
           ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
        )
        .bind(now, ids, questionIds, duel.id, tx),
    ]);
    // Өөр хүсэлт түрүүлж эхлүүлсэн, эсвэл гишүүн өөр тулаанд орсон: тэр гишүүнийг хасч суудлыг нээнэ.
    if (!res[0].meta.changes) return dropPlayingMembers(db, duel, ids, now);
  } catch (e) {
    // Уншсаны дараа оноо нь буурсан гишүүн: дахин уншиж, 20%-ийн хязгаар зөрчсөнийг нь хасна.
    if (isConstraintError(e, 'CHECK') && !retried) return startTeamDuelIfFull(env, duel, now, true);
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Боргоцой хүрэлцэхгүй');
    throw e;
  }

  const teamOf = new Map(parties.map((p) => [p.id, p.team]));
  try {
    const stub = env.DUEL_ROOM.get(env.DUEL_ROOM.idFromName(duelRoomName(duel.id)));
    await stub.init({
      duelId: duel.id,
      subject: duel.subject,
      stake: duel.stake,
      teamSize: duel.team_size,
      players: await playerInfo(db, users, (id) => teamOf.get(id) ?? 'a'),
      questions: toDuelQuestions(picked),
    });
  } catch (e) {
    console.error('[duel] room init failed', e);
    await settleDuel(db, { id: duel.id, stake: duel.stake, teamSize: duel.team_size, players: parties }, { kind: 'refund' }, 'no_show', {});
    throw new ApiError(500, 'INTERNAL', 'Тулааны өрөө нээгдсэнгүй');
  }
}

/**
 * 1 vs 1 сорилтыг хүлээн авна: хоёулангийнх нь 20%-ийн хязгаарыг шалгаад, хоёр бооцоог нэг batch-аар
 * түр хасна (оноо хүрэлцэхгүй бол CHECK → rollback), 3 асуулт сонгож DuelRoom-ыг эхлүүлнэ.
 */
async function startDuel(env: Bindings, userId: number, duel: DuelRow, now: number): Promise<DuelSummary> {
  const db = env.DB;
  const duelId = duel.id;
  const acceptor = await checkCanJoin(db, userId, duel);
  const creator = await getUserRow(db, duel.creator_id);

  if (stakeError(duel.stake, creator.points)) {
    // Үүсгэгчийн боргоцой буурч 20%-ийн хязгаар зөрчигдсөн → сорилт хүчингүй.
    await cancelChallenge(db, creator.id, duelId, now).catch(() => undefined);
    throw new ApiError(409, 'OPPONENT_STAKE_TOO_HIGH', 'Үүсгэгчийн боргоцойн 20%-иас хэтэрсэн');
  }

  // Хоёулаа хараагүй асуултыг илүүд үзнэ. Хурдны тулд LLM дуудахгүй, pool-оос. Номын асуулт зөвхөн хоёулангийнх нь
  // ангийн номынх.
  const { results: picked } = await db
    .prepare(
      `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation FROM questions q
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND (q.book_ref IS NULL OR (q.grade = ? AND q.grade = ?))
       ORDER BY (SELECT COUNT(*) FROM seen_questions s WHERE s.question_id = q.id AND s.user_id IN (?, ?)), RANDOM()
       LIMIT ?`,
    )
    .bind(duel.tier, duel.subject, creator.grade, acceptor.grade, creator.id, userId, GAME.DUEL.QUESTIONS)
    .all<PickedQuestion>();
  if (picked.length < GAME.DUEL.QUESTIONS) throw new ApiError(503, 'NO_QUESTIONS', 'Асуулт хүрэлцэхгүй');
  const questionIds = JSON.stringify(picked.map((q) => q.id));

  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM duels WHERE id = ? AND tx = ?)';
  try {
    const res = await db.batch([
      db
        // Хоёулаа өөр тулаан хийгээгүй байхыг энд дахин шалгана (зэрэг хоёр сорилт хүлээн авахаас).
        .prepare(
          `UPDATE duels SET status = 'accepted', opponent_id = ?, accepted_at = ?, question_ids = ?, tx = ?
           WHERE id = ? AND status = 'open'
             AND NOT EXISTS (SELECT 1 FROM duels WHERE status = 'accepted' AND (creator_id IN (?, ?) OR opponent_id IN (?, ?)))
             AND NOT EXISTS (SELECT 1 FROM duel_members m JOIN duels d2 ON d2.id = m.duel_id WHERE d2.status = 'accepted' AND m.user_id IN (?, ?))`,
        )
        .bind(userId, now, questionIds, tx, duelId, creator.id, userId, creator.id, userId, creator.id, userId),
      db.prepare(`UPDATE users SET points = points - ? WHERE id IN (?, ?) AND ${guard}`).bind(duel.stake, creator.id, userId, duelId, tx),
      db
        .prepare(
          `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
           SELECT id, ?, 'duel_stake', 'duel', ?, ? FROM users WHERE id IN (?, ?) AND ${guard}`,
        )
        .bind(-duel.stake, String(duelId), now, creator.id, userId, duelId, tx),
      // Хүлээн авагчийн өөрийн нээлттэй сорилт байвал хаана, багт бүртгүүлсэн бол гаргана (нэг хүн нэг тулаан).
      db
        .prepare(`UPDATE duels SET status = 'cancelled', end_reason = 'cancelled', finished_at = ? WHERE creator_id = ? AND status = 'open' AND ${guard}`)
        .bind(now, userId, duelId, tx),
      db
        .prepare(`DELETE FROM duel_members WHERE user_id = ? AND duel_id IN (SELECT id FROM duels WHERE status = 'open') AND ${guard}`)
        .bind(userId, duelId, tx),
      db
        .prepare(
          `INSERT INTO seen_questions (user_id, question_id, seen_at)
           SELECT u.id, j.value, ? FROM users u, json_each(?) j WHERE u.id IN (?, ?) AND ${guard}
           ON CONFLICT (user_id, question_id) DO UPDATE SET seen_at = excluded.seen_at`,
        )
        .bind(now, questionIds, creator.id, userId, duelId, tx),
    ]);
    if (!res[0].meta.changes) {
      const current = await db.prepare('SELECT status FROM duels WHERE id = ?').bind(duelId).first<{ status: string }>();
      if (current?.status === 'open') throw new ApiError(409, 'DUEL_EXISTS', 'Явагдаж буй тулаан байна');
      throw new ApiError(409, 'DUEL_TAKEN', 'Өөр хүн түрүүлж авлаа');
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Боргоцой хүрэлцэхгүй');
    throw e;
  }

  const parties: DuelParty[] = [
    { id: creator.id, team: 'a' },
    { id: userId, team: 'b' },
  ];
  try {
    const stub = env.DUEL_ROOM.get(env.DUEL_ROOM.idFromName(duelRoomName(duelId)));
    await stub.init({
      duelId,
      subject: duel.subject,
      stake: duel.stake,
      teamSize: 1,
      players: await playerInfo(db, [creator, acceptor], (id) => (id === creator.id ? 'a' : 'b')),
      questions: toDuelQuestions(picked),
    });
  } catch (e) {
    console.error('[duel] room init failed', e);
    await settleDuel(db, { id: duelId, stake: duel.stake, teamSize: 1, players: parties }, { kind: 'refund' }, 'no_show', {});
    throw new ApiError(500, 'INTERNAL', 'Тулааны өрөө нээгдсэнгүй');
  }
  return getDuelSummary(db, duelId, userId);
}
