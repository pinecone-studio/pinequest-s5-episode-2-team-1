import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HealthResponse } from '../../shared/types';
import { ubDay } from './domain/time';
import type { AppEnv } from './env';
import { errorHandler } from './lib/errors';
import { adminRoutes } from './routes/admin';
import { authRoutes, meRoutes } from './routes/auth';

export { DuelRoom } from './duel/DuelRoom';

const app = new Hono<AppEnv>();

// Expo web (localhost:8081) -ээс шалгахад хэрэгтэй; утсан дээрх апп-д CORS хамаагүй.
app.use('*', cors());
app.onError(errorHandler);
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Олдсонгүй' } }, 404));

app.get('/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM questions WHERE flagged = 0').first<{ n: number }>();
  const now = Date.now();
  return c.json<HealthResponse>({ ok: true, time: now, day: ubDay(now), questions: row?.n ?? 0 });
});

app.route('/auth', authRoutes);
app.route('/me', meRoutes);
app.route('/admin', adminRoutes);

export default app;
