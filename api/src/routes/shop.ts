import { Hono } from 'hono';
import { z } from 'zod';
import type { MeResponse, ShopResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { buyItem, equipItem, shopView } from '../services/shop';

export const shopRoutes = new Hono<AppEnv>();
shopRoutes.use('*', requireAuth);

shopRoutes.get('/', async (c) => c.json<ShopResponse>(await shopView(c.env.DB, c.get('userId'))));

shopRoutes.post('/:itemId/buy', async (c) => c.json<ShopResponse>(await buyItem(c.env.DB, c.get('userId'), c.req.param('itemId'))));

export const avatarRoutes = new Hono<AppEnv>();
avatarRoutes.use('*', requireAuth);

avatarRoutes.post('/equip', async (c) => {
  const body = await readBody(
    c,
    z.object({
      slot: z.enum(['skin', 'hair', 'top', 'bottom', 'shoes', 'accessory']),
      itemId: z.string().min(1).nullable(),
    }),
  );
  return c.json<MeResponse>({ me: await equipItem(c.env.DB, c.get('userId'), body.slot, body.itemId) });
});
