import { Hono } from 'hono';
import { z } from 'zod';
import type { DuelResponse, LobbyResponse } from '../../../shared/types';
import { SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, parseId, readBody } from '../lib/errors';
import { bearerToken, requireAuth, userIdForToken } from '../lib/session';
import { acceptChallenge, cancelChallenge, createChallenge, duelRoomName, getDuelSummary, lobby } from '../services/duels';

export const duelRoutes = new Hono<AppEnv>();

duelRoutes.get('/', requireAuth, async (c) => {
  return c.json<LobbyResponse>(await lobby(c.env.DB, c.get('userId')));
});

duelRoutes.post('/', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ subject: z.enum(SUBJECTS), stake: z.number() }));
  return c.json<DuelResponse>({ duel: await createChallenge(c.env.DB, c.get('userId'), body.subject, body.stake) }, 201);
});

duelRoutes.get('/:id', requireAuth, async (c) => {
  return c.json<DuelResponse>({ duel: await getDuelSummary(c.env.DB, parseId(c.req.param('id'))) });
});

duelRoutes.post('/:id/accept', requireAuth, async (c) => {
  return c.json<DuelResponse>({ duel: await acceptChallenge(c.env, c.get('userId'), parseId(c.req.param('id'))) });
});

duelRoutes.post('/:id/cancel', requireAuth, async (c) => {
  await cancelChallenge(c.env.DB, c.get('userId'), parseId(c.req.param('id')));
  return c.body(null, 204);
});

/**
 * WebSocket → DuelRoom. Браузер/RN-ийн стандарт WebSocket header дамжуулдаггүй тул token-ийг
 * query-ээр авч энд шалгаад, DO руу X-User-Id-тай дамжуулна.
 */
duelRoutes.get('/:id/ws', async (c) => {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') throw new ApiError(400, 'BAD_REQUEST', 'WebSocket хүлээж байна');
  const token = c.req.query('token') ?? bearerToken(c);
  const userId = token ? await userIdForToken(c.env.DB, token) : null;
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
