import { Hono } from 'hono';
import { z } from 'zod';
import type { DuelResponse, LobbyResponse } from '../../../shared/types';
import { SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, parseId, readBody } from '../lib/errors';
import { requireAuth, userIdForToken } from '../lib/session';
import { acceptChallenge, cancelChallenge, createChallenge, duelRoomName, getDuelSummary, joinByCode, lobby } from '../services/duels';

export const duelRoutes = new Hono<AppEnv>();

duelRoutes.get('/', requireAuth, async (c) => {
  return c.json<LobbyResponse>(await lobby(c.env.DB, c.get('userId')));
});

duelRoutes.post('/', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({ subject: z.enum(SUBJECTS), stake: z.number(), visibility: z.enum(['public', 'private']).default('public') }),
  );
  return c.json<DuelResponse>({ duel: await createChallenge(c.env.DB, c.get('userId'), body.subject, body.stake, body.visibility) }, 201);
});

duelRoutes.post('/join', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ code: z.string().max(20) }));
  return c.json<DuelResponse>({ duel: await joinByCode(c.env, c.get('userId'), body.code) });
});

duelRoutes.get('/:id', requireAuth, async (c) => {
  return c.json<DuelResponse>({ duel: await getDuelSummary(c.env.DB, parseId(c.req.param('id')), c.get('userId')) });
});

duelRoutes.post('/:id/accept', requireAuth, async (c) => {
  return c.json<DuelResponse>({ duel: await acceptChallenge(c.env, c.get('userId'), parseId(c.req.param('id'))) });
});

duelRoutes.post('/:id/cancel', requireAuth, async (c) => {
  await cancelChallenge(c.env.DB, c.get('userId'), parseId(c.req.param('id')));
  return c.body(null, 204);
});

/**
 * WebSocket → DuelRoom. Браузер/RN-ийн WebSocket нь Authorization header илгээж чаддаггүй тул token-ийг
 * subprotocol-оор авна: `new WebSocket(url, ['bearer', token])`. URL-д (тэгэхээр log-д) token орохгүй.
 * Энд шалгаад DO руу X-User-Id-тай дамжуулна.
 */
duelRoutes.get('/:id/ws', async (c) => {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') throw new ApiError(400, 'BAD_REQUEST', 'WebSocket хүлээж байна');
  const [scheme, token] = (c.req.header('sec-websocket-protocol') ?? '').split(',').map((s) => s.trim());
  const userId = scheme === 'bearer' && token ? await userIdForToken(c.env.DB, token) : null;
  if (!userId) throw new ApiError(401, 'UNAUTHORIZED', 'Нэвтрэх шаардлагатай');

  const duelId = parseId(c.req.param('id'));
  const duel = await c.env.DB.prepare('SELECT creator_id, opponent_id, status FROM duels WHERE id = ?')
    .bind(duelId)
    .first<{ creator_id: number; opponent_id: number | null; status: string }>();
  if (!duel || (duel.creator_id !== userId && duel.opponent_id !== userId)) throw new ApiError(403, 'FORBIDDEN', 'Тоглогч биш');
  if (duel.status === 'open') throw new ApiError(409, 'DUEL_NOT_OPEN', 'Сорилтыг хараахан хүлээн аваагүй');

  const stub = c.env.DUEL_ROOM.get(c.env.DUEL_ROOM.idFromName(duelRoomName(duelId)));
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-User-Id', String(userId));
  return stub.fetch(new Request(c.req.raw.url, { headers }));
});
