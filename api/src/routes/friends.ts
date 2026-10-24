import { Hono } from 'hono';
import { z } from 'zod';
import type { FriendActionResponse, FriendsResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { addFriend, listFriends, removeFriend } from '../services/friends';

/** Найзууд: бүгд профайлын кодоор (QR-аас уншсан эсвэл бичсэн). */
export const friendRoutes = new Hono<AppEnv>();
friendRoutes.use('*', requireAuth);

friendRoutes.get('/', async (c) => c.json<FriendsResponse>(await listFriends(c.env.DB, c.get('userId'))));

/** Хүсэлт илгээнэ; тэр надад аль хэдийн илгээсэн бол зөвшөөрнө. */
friendRoutes.post('/', async (c) => {
  const body = await readBody(c, z.object({ code: z.string().min(1).max(40) }));
  return c.json<FriendActionResponse>({ friend: await addFriend(c.env.DB, c.get('userId'), body.code) });
});

/** Хүсэлтийг татгалзах, илгээснээ цуцлах, найзаас хасах. */
friendRoutes.delete('/:code', async (c) =>
  c.json<FriendActionResponse>({ friend: await removeFriend(c.env.DB, c.get('userId'), c.req.param('code')) }),
);
