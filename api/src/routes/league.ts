import { Hono } from 'hono';
import type { LeagueResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import type { AppEnv } from '../env';
import { requireAuth } from '../lib/session';
import { league } from '../services/league';

/** Уулын Лиг: миний Уулын лиг, бүлгийн эрэмбэ. */
export const leagueRoutes = new Hono<AppEnv>();
leagueRoutes.use('*', requireAuth);

// ?grade=8: өөр ангийн уралдааныг харах (6–12); буруу бол миний анги
leagueRoutes.get('/', async (c) => {
  const g = Number(c.req.query('grade'));
  const view = Number.isInteger(g) && g >= GAME.GRADE_MIN && g <= GAME.GRADE_MAX ? g : undefined;
  return c.json<LeagueResponse>(await league(c.env.DB, c.get('userId'), Date.now(), view));
});
