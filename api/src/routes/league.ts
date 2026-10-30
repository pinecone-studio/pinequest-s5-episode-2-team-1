import { Hono } from 'hono';
import type { LeagueResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { requireAuth } from '../lib/session';
import { league } from '../services/league';

/** Уулын Лиг: миний Уулын лиг, бүлгийн эрэмбэ. */
export const leagueRoutes = new Hono<AppEnv>();
leagueRoutes.use('*', requireAuth);

leagueRoutes.get('/', async (c) => c.json<LeagueResponse>(await league(c.env.DB, c.get('userId'))));
