import type { DuelPlayerDto, DuelSummary, DuelVisibility, LobbyResponse, Subject } from '../../../shared/types';
import { GAME } from '../config/game';
import type { DuelQuestion, Settlement } from '../duel/engine';
import { newDuelCode, normalizeDuelCode } from '../domain/duelCode';
import { levelFromXp } from '../domain/level';
import { maxStake, stakeError } from '../domain/stake';
import type { Bindings } from '../env';
import { isConstraintError, newTx } from '../lib/db';
import { ApiError } from '../lib/errors';
import { avatarLook, type CatalogItem, getCatalog, parseEquipped } from './items';
import { getUserRow, type UserRow } from './users';

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
  c_xp: number;
  c_equipped: string;
  o_username: string | null;
  o_xp: number | null;
  o_equipped: string | null;
}

const SUMMARY_SELECT = `
  SELECT d.*, c.username AS c_username, c.xp AS c_xp, c.equipped AS c_equipped,
         o.username AS o_username, o.xp AS o_xp, o.equipped AS o_equipped
  FROM duels d
  JOIN users c ON c.id = d.creator_id
  LEFT JOIN users o ON o.id = d.opponent_id`;

/** Хэрэглэгч (?, ?, ?) нээлттэй сорилттой эсвэл тулаан хийж байна. */
const BUSY_SQL = `SELECT 1 FROM duels WHERE (creator_id = ? AND status = 'open')
  OR (status = 'accepted' AND (creator_id = ? OR opponent_id = ?))`;

export function duelRoomName(duelId: number): string {
  return `duel-${duelId}`;
}

function player(id: number, username: string, xp: number, equipped: string, catalog: Map<string, CatalogItem>): DuelPlayerDto {
  return { id, username, level: levelFromXp(xp), avatar: avatarLook(parseEquipped(equipped), catalog) };
}

/** `viewerId` = хэн харж байгаа: урилгын кодыг зөвхөн үүсгэгчид харуулна. */
function toSummary(r: SummaryRow, catalog: Map<string, CatalogItem>, viewerId: number): DuelSummary {
  return {
    id: r.id,
    subject: r.subject,
    stake: r.stake,
    status: r.status,
    visibility: r.visibility,
    code: viewerId === r.creator_id && r.status === 'open' ? r.code : null,
    createdAt: r.created_at,
    creator: player(r.creator_id, r.c_username, r.c_xp, r.c_equipped, catalog),
    opponent:
      r.opponent_id && r.o_username !== null ? player(r.opponent_id, r.o_username, r.o_xp ?? 0, r.o_equipped ?? '{}', catalog) : null,
    winnerId: r.winner_id,
    endReason: r.end_reason,
    creatorScore: r.creator_score,
    opponentScore: r.opponent_score,
  };
}

export async function getDuelSummary(db: D1Database, duelId: number, viewerId: number): Promise<DuelSummary> {
  const row = await db.prepare(`${SUMMARY_SELECT} WHERE d.id = ?`).bind(duelId).first<SummaryRow>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Тулаан олдсонгүй');
  return toSummary(row, await getCatalog(db), viewerId);
}

/**
 * Тулааны эцсийн тооцоо (нэг batch): ялагчид хоёр бооцоо, эсвэл хоёуланд нь буцаалт.
 * `status = 'accepted'` → шилжилт зөвхөн нэг удаа амжилттай болох тул дахин дуудахад аюулгүй.
 */
export async function settleDuel(
  db: D1Database,
  duel: { id: number; stake: number; creatorId: number; opponentId: number },
  settlement: Settlement,
  reason: string,
  scores: Record<string, number>,
  now = Date.now(),
): Promise<Record<number, number>> {
  const tx = newTx();
  const guard = 'EXISTS (SELECT 1 FROM duels WHERE id = ? AND tx = ?)';
  const status = reason === 'no_show' || reason === 'stale' ? 'cancelled' : 'finished';
  const winnerId = settlement.kind === 'win' ? settlement.winnerId : null;
  const ledger = db.prepare(
    `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
     SELECT ?, ?, ?, 'duel', ?, ? WHERE ${guard}`,
  );
  const credit = db.prepare(`UPDATE users SET points = points + ? WHERE id = ? AND ${guard}`);

  const statements = [
    db
      .prepare(
        `UPDATE duels SET status = ?, winner_id = ?, creator_score = ?, opponent_score = ?, end_reason = ?, finished_at = ?, tx = ?
         WHERE id = ? AND status = 'accepted'`,
      )
      .bind(status, winnerId, scores[String(duel.creatorId)] ?? 0, scores[String(duel.opponentId)] ?? 0, reason, now, tx, duel.id),
  ];
  if (settlement.kind === 'win') {
    statements.push(
      credit.bind(duel.stake * 2, settlement.winnerId, duel.id, tx),
      ledger.bind(settlement.winnerId, duel.stake * 2, 'duel_payout', String(duel.id), now, duel.id, tx),
    );
  } else {
    for (const uid of [duel.creatorId, duel.opponentId]) {
      statements.push(credit.bind(duel.stake, uid, duel.id, tx), ledger.bind(uid, duel.stake, 'duel_refund', String(duel.id), now, duel.id, tx));
    }
  }
  await db.batch(statements);

  const { results } = await db
    .prepare('SELECT id, points FROM users WHERE id IN (?, ?)')
    .bind(duel.creatorId, duel.opponentId)
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
    .prepare(`SELECT id, stake, creator_id, opponent_id FROM duels WHERE status = 'accepted' AND accepted_at < ?`)
    .bind(now - GAME.DUEL.STALE_ACCEPTED_MS)
    .all<{ id: number; stake: number; creator_id: number; opponent_id: number }>();
  for (const d of results) {
    await settleDuel(db, { id: d.id, stake: d.stake, creatorId: d.creator_id, opponentId: d.opponent_id }, { kind: 'refund' }, 'stale', {}, now);
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
  const catalog = await getCatalog(db);
  const { results: open } = await db
    .prepare(
      `${SUMMARY_SELECT}
       WHERE d.status = 'open' AND d.visibility = 'public' AND d.tier = ? AND d.creator_id != ? AND d.creator_seen_at >= ?
       ORDER BY d.created_at DESC LIMIT 30`,
    )
    .bind(user.tier, userId, now - GAME.DUEL.LOBBY_PRESENCE_MS)
    .all<SummaryRow>();
  const mine = await db
    .prepare(`${SUMMARY_SELECT} WHERE (d.creator_id = ? OR d.opponent_id = ?) AND d.status IN ('open', 'accepted') ORDER BY d.id DESC LIMIT 1`)
    .bind(userId, userId)
    .first<SummaryRow>();
  return {
    open: open.map((r) => toSummary(r, catalog, userId)),
    mine: mine ? toSummary(mine, catalog, userId) : null,
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
  now = Date.now(),
): Promise<DuelSummary> {
  await sweepStale(db, now);
  const user = await getUserRow(db, userId);
  const err = stakeError(stake, user.points);
  if (err) throw new ApiError(400, err, `Бооцоо 1–${maxStake(user.points)} оноо байна`);
  // "Завгүй эсэх"-ийг INSERT дотор шалгана: зэрэг хоёр хүсэлт хоёр сорилт үүсгэхгүй.
  // Урилгын код нээлттэй сорилтуудын дунд давтагдвал (UNIQUE index) шинэ кодоор дахин оролдоно.
  const insert = db.prepare(
    `INSERT INTO duels (tier, subject, stake, creator_id, status, visibility, code, creator_seen_at, created_at)
     SELECT ?, ?, ?, ?, 'open', ?, ?, ?, ? WHERE NOT EXISTS (${BUSY_SQL})
     RETURNING id`,
  );
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await insert
        .bind(user.tier, subject, stake, userId, visibility, newDuelCode(), now, now, userId, userId, userId)
        .first<{ id: number }>();
      if (!row) throw new ApiError(409, 'DUEL_EXISTS', 'Нээлттэй тулаан байна');
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
export async function acceptChallenge(env: Bindings, userId: number, duelId: number, now = Date.now()): Promise<DuelSummary> {
  await sweepStale(env.DB, now);
  const duel = await env.DB.prepare('SELECT * FROM duels WHERE id = ?').bind(duelId).first<DuelRow>();
  if (!duel || (duel.visibility === 'private' && duel.creator_id !== userId)) throw new ApiError(404, 'NOT_FOUND', 'Сорилт олдсонгүй');
  return startDuel(env, userId, duel, now);
}

/** Урилгын кодоор (public ч бай, private ч бай) нээлттэй сорилтод нэгдэнэ. */
export async function joinByCode(env: Bindings, userId: number, input: string, now = Date.now()): Promise<DuelSummary> {
  const code = normalizeDuelCode(input);
  if (!code) throw new ApiError(400, 'BAD_REQUEST', `Код ${GAME.DUEL.CODE_LENGTH} оронтой тоо байна`);
  await sweepStale(env.DB, now);
  const duel = await env.DB.prepare(`SELECT * FROM duels WHERE code = ? AND status = 'open'`).bind(code).first<DuelRow>();
  if (!duel) throw new ApiError(404, 'CODE_NOT_FOUND', 'Ийм кодтой нээлттэй тулаан алга');
  return startDuel(env, userId, duel, now);
}

/**
 * Сорилтыг хүлээн авна: хоёулангийнх нь 20%-ийн хязгаарыг шалгаад, хоёр бооцоог нэг batch-аар
 * түр хасна (оноо хүрэлцэхгүй бол CHECK → rollback), 3 асуулт сонгож DuelRoom-ыг эхлүүлнэ.
 */
async function startDuel(env: Bindings, userId: number, duel: DuelRow, now: number): Promise<DuelSummary> {
  const db = env.DB;
  const duelId = duel.id;
  if (duel.creator_id === userId) throw new ApiError(409, 'OWN_DUEL', 'Өөрийн сорилт');
  if (duel.status !== 'open') throw new ApiError(409, duel.status === 'accepted' ? 'DUEL_TAKEN' : 'DUEL_NOT_OPEN', 'Сорилт хаагдсан');

  const acceptor = await getUserRow(db, userId);
  if (acceptor.tier !== duel.tier) throw new ApiError(403, 'WRONG_TIER', 'Өөр түвшний сорилт');
  const active = await db
    .prepare(`SELECT id FROM duels WHERE status = 'accepted' AND (creator_id = ? OR opponent_id = ?) LIMIT 1`)
    .bind(userId, userId)
    .first();
  if (active) throw new ApiError(409, 'DUEL_EXISTS', 'Явагдаж буй тулаан байна');

  const creator = await getUserRow(db, duel.creator_id);
  if (stakeError(duel.stake, creator.points)) {
    // Үүсгэгчийн оноо буурч 20%-ийн хязгаар зөрчигдсөн → сорилт хүчингүй.
    await cancelChallenge(db, creator.id, duelId, now).catch(() => undefined);
    throw new ApiError(409, 'OPPONENT_STAKE_TOO_HIGH', 'Үүсгэгчийн онооны 20%-иас хэтэрсэн');
  }
  if (stakeError(duel.stake, acceptor.points)) throw new ApiError(400, 'STAKE_TOO_HIGH', 'Таны онооны 20%-иас их бооцоо');

  // Хоёулаа хараагүй асуултыг илүүд үзнэ. Хурдны тулд LLM дуудахгүй, pool-оос. Номын асуулт зөвхөн хоёулангийнх нь
  // ангийн номынх (өөр ангийнхан бол зөвхөн номгүй асуулт).
  const { results: picked } = await db
    .prepare(
      `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation FROM questions q
       WHERE q.tier = ? AND q.subject = ? AND q.flagged = 0 AND (q.book_ref IS NULL OR (q.grade = ? AND q.grade = ?))
       ORDER BY (SELECT COUNT(*) FROM seen_questions s WHERE s.question_id = q.id AND s.user_id IN (?, ?)), RANDOM()
       LIMIT ?`,
    )
    .bind(duel.tier, duel.subject, creator.grade, acceptor.grade, creator.id, userId, GAME.DUEL.QUESTIONS)
    .all<{ id: number; prompt: string; options: string; correct_index: number; explanation: string }>();
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
             AND NOT EXISTS (SELECT 1 FROM duels WHERE status = 'accepted' AND (creator_id IN (?, ?) OR opponent_id IN (?, ?)))`,
        )
        .bind(userId, now, questionIds, tx, duelId, creator.id, userId, creator.id, userId),
      db.prepare(`UPDATE users SET points = points - ? WHERE id IN (?, ?) AND ${guard}`).bind(duel.stake, creator.id, userId, duelId, tx),
      db
        .prepare(
          `INSERT INTO point_ledger (user_id, delta, reason, ref_type, ref_id, created_at)
           SELECT id, ?, 'duel_stake', 'duel', ?, ? FROM users WHERE id IN (?, ?) AND ${guard}`,
        )
        .bind(-duel.stake, String(duelId), now, creator.id, userId, duelId, tx),
      // Хүлээн авагчийн өөрийн нээлттэй сорилт байвал хаана (нэг хүн нэг тулаан).
      db
        .prepare(`UPDATE duels SET status = 'cancelled', end_reason = 'cancelled', finished_at = ? WHERE creator_id = ? AND status = 'open' AND ${guard}`)
        .bind(now, userId, duelId, tx),
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
    if (isConstraintError(e, 'CHECK')) throw new ApiError(409, 'INSUFFICIENT_POINTS', 'Оноо хүрэлцэхгүй');
    throw e;
  }

  const catalog = await getCatalog(db);
  const info = (u: UserRow) => ({ id: u.id, username: u.username, avatar: avatarLook(parseEquipped(u.equipped), catalog) });
  const questions: DuelQuestion[] = picked.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: JSON.parse(q.options) as string[],
    correctIndex: q.correct_index,
    explanation: q.explanation,
  }));
  try {
    const stub = env.DUEL_ROOM.get(env.DUEL_ROOM.idFromName(duelRoomName(duelId)));
    await stub.init({ duelId, subject: duel.subject, stake: duel.stake, players: [info(creator), info(acceptor)], questions });
  } catch (e) {
    console.error('[duel] room init failed', e);
    await settleDuel(db, { id: duelId, stake: duel.stake, creatorId: creator.id, opponentId: userId }, { kind: 'refund' }, 'no_show', {});
    throw new ApiError(500, 'INTERNAL', 'Тулааны өрөө нээгдсэнгүй');
  }
  return getDuelSummary(db, duelId, userId);
}
