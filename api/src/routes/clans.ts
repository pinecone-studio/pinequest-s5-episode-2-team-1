import { Hono } from 'hono';
import { z } from 'zod';
import { CLAN_NAME_MAX } from '../../../shared/clan';
import type { ClanPreviewResponse, MyClanResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { createClan, joinClan, leaveClan, myClan, previewClan, removeMember, renameClan, rotateClanCode } from '../services/clans';

/** Уул (ангийн баг): 6 оронтой кодоор нэгдэнэ. `/mine/*` нь миний Уул, `/:code` нь нэгдэхээс өмнө харах. */
export const clanRoutes = new Hono<AppEnv>();
clanRoutes.use('*', requireAuth);

// " Уул"-ыг давхар бичсэнийг хасахаас өмнөх урт тул CLAN_NAME_MAX-аас арай урт зөвшөөрнө (normalizeClanName тасална).
const nameSchema = z.string().max(CLAN_NAME_MAX + 16);

clanRoutes.get('/mine', async (c) => c.json<MyClanResponse>(await myClan(c.env.DB, c.get('userId'))));

clanRoutes.post('/', async (c) => {
  const body = await readBody(c, z.object({ name: nameSchema.optional() }));
  return c.json<MyClanResponse>(await createClan(c.env.DB, c.get('userId'), body.name));
});

clanRoutes.patch('/mine', async (c) => {
  const body = await readBody(c, z.object({ name: nameSchema }));
  return c.json<MyClanResponse>(await renameClan(c.env.DB, c.get('userId'), body.name));
});

/** Урилгын кодыг солих (эзэн). */
clanRoutes.post('/mine/code', async (c) => c.json<MyClanResponse>(await rotateClanCode(c.env.DB, c.get('userId'))));

clanRoutes.post('/mine/leave', async (c) => c.json<MyClanResponse>(await leaveClan(c.env.DB, c.get('userId'))));

/** Гишүүнийг профайлын кодоор нь хасах (эзэн). */
clanRoutes.delete('/mine/members/:code', async (c) =>
  c.json<MyClanResponse>(await removeMember(c.env.DB, c.get('userId'), c.req.param('code'))),
);

clanRoutes.get('/:code', async (c) => c.json<ClanPreviewResponse>(await previewClan(c.env.DB, c.get('userId'), c.req.param('code'))));

clanRoutes.post('/:code/join', async (c) => c.json<MyClanResponse>(await joinClan(c.env.DB, c.get('userId'), c.req.param('code'))));
