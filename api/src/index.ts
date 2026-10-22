import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HealthResponse } from '../../shared/types';
import { ubDay } from './domain/time';
import type { AppEnv } from './env';
import { errorHandler } from './lib/errors';
import { adminRoutes } from './routes/admin';
import { authRoutes, meRoutes } from './routes/auth';
import { duelRoutes } from './routes/duels';
import { recoveryRoutes } from './routes/recovery';
import { avatarRoutes, shopRoutes } from './routes/shop';
import { questionRoutes, shieldRoutes, taskRoutes } from './routes/tasks';
import { tutorRoutes } from './routes/tutor';

export { DuelRoom } from './duel/DuelRoom';

const app = new Hono<AppEnv>();

// Expo web (localhost:8081) -ээс шалгахад хэрэгтэй; утсан дээрх апп-д CORS хамаагүй.
// WebSocket upgrade-ийн 101 хариуг өөрчлөхгүйн тулд CORS-ийг алгасна.
const corsMiddleware = cors();
app.use('*', (c, next) => (c.req.header('upgrade')?.toLowerCase() === 'websocket' ? next() : corsMiddleware(c, next)));
app.onError(errorHandler);
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Олдсонгүй' } }, 404));

app.get('/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM questions WHERE flagged = 0').first<{ n: number }>();
  const now = Date.now();
  return c.json<HealthResponse>({ ok: true, time: now, day: ubDay(now), questions: row?.n ?? 0 });
});

app.route('/auth', authRoutes);
app.route('/me', meRoutes);
app.route('/tasks', taskRoutes);
app.route('/questions', questionRoutes);
app.route('/shield', shieldRoutes);
app.route('/duels', duelRoutes);
app.route('/recovery', recoveryRoutes);
app.route('/shop', shopRoutes);
app.route('/avatar', avatarRoutes);
app.route('/admin', adminRoutes);
app.route('/tutor', tutorRoutes);

export default app;
