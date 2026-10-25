import { GAME } from '../config/game';
import { newProfileCode, normalizeProfileCode } from '../domain/profile';
import { isConstraintError } from '../lib/db';
import { ApiError } from '../lib/errors';

// Профайлын код: профайл харах, найз нэмэх аль аль нь зөвхөн үүгээр (нэр, id-аар хайхгүй).

/**
 * Профайлын код онооно (`replace` = false бол код байхгүй үед л: зэрэг ирсэн хоёр хүсэлт хоёр өөр код өгөхгүй).
 * Өөр хэрэглэгчийн кодтой давхцвал (UNIQUE index) шинэ кодоор дахин оролдоно.
 */
export async function assignProfileCode(db: D1Database, userId: number, replace: boolean): Promise<string> {
  const update = db.prepare(`UPDATE users SET profile_code = ? WHERE id = ?${replace ? '' : ' AND profile_code IS NULL'}`);
  for (let attempt = 0; ; attempt++) {
    try {
      await update.bind(newProfileCode(), userId).run();
      break;
    } catch (e) {
      if (attempt < 4 && isConstraintError(e, 'UNIQUE')) continue;
      throw e;
    }
  }
  const code = await currentProfileCode(db, userId);
  if (!code) throw new ApiError(500, 'INTERNAL');
  return code;
}

async function currentProfileCode(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare('SELECT profile_code FROM users WHERE id = ?').bind(userId).first<{ profile_code: string | null }>();
  if (!row) throw new ApiError(401, 'UNAUTHORIZED', 'Хэрэглэгч олдсонгүй');
  return row.profile_code;
}

/** Одоогийн код; байхгүй бол үүсгэнэ. */
export async function ensureProfileCode(db: D1Database, userId: number): Promise<string> {
  return (await currentProfileCode(db, userId)) ?? assignProfileCode(db, userId, false);
}

/** Хэрэглэгчийн бичсэн (эсвэл QR-аас уншсан) кодоор профайлын эзний id-г олно. */
export async function profileOwner(db: D1Database, input: string): Promise<number> {
  const code = normalizeProfileCode(input);
  if (!code) throw new ApiError(400, 'BAD_REQUEST', `Код ${GAME.PROFILE.CODE_LENGTH} оронтой тоо байна`);
  const row = await db.prepare('SELECT id FROM users WHERE profile_code = ?').bind(code).first<{ id: number }>();
  if (!row) throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Ийм кодтой профайл алга');
  return row.id;
}
