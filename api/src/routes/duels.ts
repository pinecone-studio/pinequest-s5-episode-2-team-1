import { Hono } from 'hono';
import { z } from 'zod';
import type { DuelResponse, LobbyResponse } from '../../../shared/types';
import { GAME, SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, parseId, readBody } from '../lib/errors';
import { requireAuth, userIdForToken } from '../lib/session';
import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  duelRoomName,
  getDuelSummary,
  isParticipant,
  joinByCode,
  leaveTeam,
  lobby,
  switchTeam,
} from '../services/duels';

export const duelRoutes = new Hono<AppEnv>();

const team = z.enum(['a', 'b']);

duelRoutes.get('/', requireAuth, async (c) => {
  return c.json<LobbyResponse>(await lobby(c.env.DB, c.get('userId')));
});

duelRoutes.post('/', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({
      subject: z.enum(SUBJECTS),
      stake: z.number(),
      visibility: z.enum(['public', 'private']).default('public'),
      teamSize: z.number().int().min(1).max(GAME.DUEL.TEAM_SIZE_MAX).default(1),
    }),
  );
  return c.json<DuelResponse>(
    { duel: await createChallenge(c.env.DB, c.get('userId'), body.subject, body.stake, body.visibility, body.teamSize) },
    201,
  );
});

duelRoutes.post('/join', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ code: z.string().max(20), team: team.optional() }));
  return c.json<DuelResponse>({ duel: await joinByCode(c.env, c.get('userId'), body.code, body.team) });
});

duelRoutes.get('/:id', requireAuth, async (c) => {
  return c.json<DuelResponse>({ duel: await getDuelSummary(c.env.DB, parseId(c.req.param('id')), c.get('userId')) });
});

duelRoutes.post('/:id/accept', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ team: team.optional() }));
  return c.json<DuelResponse>({ duel: await acceptChallenge(c.env, c.get('userId'), parseId(c.req.param('id')), body.team) });
});

/** Нээлттэй багийн тулаанд нөгөө баг руу шилжинэ. */
duelRoutes.post('/:id/team', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ team }));
  return c.json<DuelResponse>({ duel: await switchTeam(c.env.DB, c.get('userId'), parseId(c.req.param('id')), body.team) });
});

/** Нээлттэй багийн тулаанаас гарна (үүсгэгч нь /cancel). */
duelRoutes.post('/:id/leave', requireAuth, async (c) => {
  await leaveTeam(c.env.DB, c.get('userId'), parseId(c.req.param('id')));
  return c.body(null, 204);
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
  const duel = await isParticipant(c.env.DB, duelId, userId);
  if (!duel) throw new ApiError(403, 'FORBIDDEN', 'Тоглогч биш');
  if (duel.status === 'open') throw new ApiError(409, 'DUEL_NOT_OPEN', 'Сорилтыг хараахан хүлээн аваагүй');

  const stub = c.env.DUEL_ROOM.get(c.env.DUEL_ROOM.idFromName(duelRoomName(duelId)));
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-User-Id', String(userId));
  return stub.fetch(new Request(c.req.raw.url, { headers }));
});
