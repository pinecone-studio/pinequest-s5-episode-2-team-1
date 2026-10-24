import { Hono } from 'hono';
import type { ProfileResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { requireAuth } from '../lib/session';
import { findProfile } from '../services/profiles';

/** Бусдын профайл: зөвхөн профайлын кодоор (нэр, id-аар хайхгүй). Өөрийнх нь GET /me/profile. */
export const profileRoutes = new Hono<AppEnv>();
profileRoutes.use('*', requireAuth);

profileRoutes.get('/:code', async (c) => c.json<ProfileResponse>(await findProfile(c.env.DB, c.get('userId'), c.req.param('code'))));
