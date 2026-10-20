import { Hono } from 'hono';
import { z } from 'zod';
import type { AnswerResponse, FlagResponse, MeResponse, TaskDto } from '../../../shared/types';
import { SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { parseId, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { answerTask, buyShield, flagQuestion, startTask } from '../services/tasks';

export const taskRoutes = new Hono<AppEnv>();
taskRoutes.use('*', requireAuth);

taskRoutes.post('/', async (c) => {
  const { subject } = await readBody(c, z.object({ subject: z.enum(SUBJECTS) }));
  return c.json<TaskDto>(await startTask(c.env, c.executionCtx, c.get('userId'), subject));
});

taskRoutes.post('/:id/answer', async (c) => {
  const body = await readBody(c, z.object({ questionId: z.number().int().positive(), choice: z.number().int().min(0).max(3) }));
  return c.json<AnswerResponse>(await answerTask(c.env.DB, c.get('userId'), parseId(c.req.param('id')), body.questionId, body.choice));
});

export const questionRoutes = new Hono<AppEnv>();
questionRoutes.use('*', requireAuth);

questionRoutes.post('/:id/flag', async (c) => {
  const body = await readBody(c, z.object({ taskId: z.number().int().positive().optional() }));
  return c.json<FlagResponse>(await flagQuestion(c.env.DB, c.get('userId'), parseId(c.req.param('id')), body.taskId));
});

export const shieldRoutes = new Hono<AppEnv>();
shieldRoutes.use('*', requireAuth);

shieldRoutes.post('/buy', async (c) => {
  return c.json<MeResponse>({ me: await buyShield(c.env.DB, c.get('userId')) });
});
