import { Hono } from 'hono';
import { z } from 'zod';
import type { RecoveryAnswerResponse, RecoveryDto } from '../../../shared/types';
import { SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { answerRecovery, loadRecovery } from '../services/recovery';

export const recoveryRoutes = new Hono<AppEnv>();
recoveryRoutes.use('*', requireAuth);

function subjectParam(value: string | undefined) {
  const parsed = z.enum(SUBJECTS).safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'BAD_REQUEST', 'Буруу хичээл');
  return parsed.data;
}

recoveryRoutes.get('/:subject', async (c) => {
  const subject = subjectParam(c.req.param('subject'));
  return c.json<RecoveryDto>(await loadRecovery(c.env.DB, c.get('userId'), subject));
});

recoveryRoutes.post('/:subject/answer', async (c) => {
  const subject = subjectParam(c.req.param('subject'));
  const { questionId, choice } = await readBody(c, z.object({ questionId: z.number().int().positive(), choice: z.number().int().min(0).max(3) }));
  return c.json<RecoveryAnswerResponse>(await answerRecovery(c.env.DB, c.get('userId'), subject, questionId, choice));
});
