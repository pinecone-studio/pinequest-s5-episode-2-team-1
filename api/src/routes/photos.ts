import { Hono } from 'hono';
import { z } from 'zod';
import type { MeResponse } from '../../../shared/types';
import { PHOTO_ID, photoMime } from '../domain/profile';
import type { AppEnv } from '../env';
import { fromB64 } from '../lib/auth';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { loadMe } from '../services/users';

/** Профайлын зураг: R2 (BOOK_FILES)-ийн `avatars/` дор, id нь users.bear_look-ийн `$.photo`-д. */
export const photoRoutes = new Hono<AppEnv>();

const MAX_BYTES = 1_500_000;
const LOOK_JSON = "CASE WHEN json_valid(bear_look) THEN bear_look ELSE '{}' END";
const key = (id: string) => `avatars/${id}`;

async function currentPhoto(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare(`SELECT json_extract(${LOOK_JSON}, '$.photo') AS photo FROM users WHERE id = ?`).bind(userId).first<{ photo: string | null }>();
  return row?.photo ?? null;
}

/** Нийтэд нээлттэй: id нь таамаглашгүй, `<Image>` header-гүй ачаална. Нэг id-ийн агуулга хэзээ ч солигдохгүй. */
photoRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const obj = PHOTO_ID.test(id) ? await c.env.BOOK_FILES.get(key(id)) : null;
  if (!obj) throw new ApiError(404, 'NOT_FOUND', 'Зураг олдсонгүй');
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
});

photoRoutes.put('/', requireAuth, async (c) => {
  const { data } = await readBody(c, z.object({ data: z.string().min(16).max(Math.ceil((MAX_BYTES * 4) / 3) + 4) }));
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = fromB64(data.replace(/^data:[^,]*,/, ''));
  } catch {
    throw new ApiError(400, 'BAD_REQUEST', 'Зураг уншигдсангүй');
  }
  const mime = photoMime(bytes);
  if (!mime) throw new ApiError(400, 'BAD_REQUEST', 'Зөвхөн JPEG, PNG, WebP зураг');
  if (bytes.length > MAX_BYTES) throw new ApiError(400, 'BAD_REQUEST', 'Зураг хэт том');

  const userId = c.get('userId');
  const old = await currentPhoto(c.env.DB, userId);
  const rand = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const id = `${userId}-${rand}`;
  await c.env.BOOK_FILES.put(key(id), bytes, { httpMetadata: { contentType: mime } });
  await c.env.DB.prepare(`UPDATE users SET bear_look = json_set(${LOOK_JSON}, '$.photo', ?) WHERE id = ?`).bind(id, userId).run();
  if (old) await c.env.BOOK_FILES.delete(key(old));
  return c.json<MeResponse>({ me: await loadMe(c.env.DB, userId) });
});

/** Зургаа устгаад баавгайн хөрөг рүү буцна. */
photoRoutes.delete('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const old = await currentPhoto(c.env.DB, userId);
  await c.env.DB.prepare(`UPDATE users SET bear_look = json_remove(${LOOK_JSON}, '$.photo') WHERE id = ?`).bind(userId).run();
  if (old) await c.env.BOOK_FILES.delete(key(old));
  return c.json<MeResponse>({ me: await loadMe(c.env.DB, userId) });
});
