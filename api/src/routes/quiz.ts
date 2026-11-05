import { Hono } from 'hono';
import { z } from 'zod';
import type { QuizActiveResponse, QuizView } from '../../../shared/teacher';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { activeQuiz, advanceQuiz, answerQuiz, joinQuiz } from '../services/quiz';
import { quizView } from '../services/quizView';

/** Ангийн шууд тэмцээн: сурагч нэгдэж хариулна, багш "Дараах"-аар удирдана. Хоёулаа GET /:id-г 1 секунд тутам асууна. */
export const quizRoutes = new Hono<AppEnv>();
quizRoutes.use('*', requireAuth);

const idOf = (raw: string) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'BAD_REQUEST', 'Буруу тэмцээн');
  return id;
};

quizRoutes.get('/active', async (c) => c.json<QuizActiveResponse>(await activeQuiz(c.env.DB, c.get('userId'))));

quizRoutes.get('/:id', async (c) => c.json<QuizView>(await quizView(c.env.DB, c.get('userId'), idOf(c.req.param('id')))));

quizRoutes.post('/:id/join', async (c) => c.json<QuizView>(await joinQuiz(c.env.DB, c.get('userId'), idOf(c.req.param('id')))));

quizRoutes.post('/:id/answer', async (c) => {
  const body = await readBody(c, z.object({ q: z.number().int().min(0), choice: z.number().int().min(0).max(3) }));
  return c.json<QuizView>(await answerQuiz(c.env.DB, c.get('userId'), idOf(c.req.param('id')), body.q, body.choice));
});

quizRoutes.post('/:id/next', async (c) => c.json<QuizView>(await advanceQuiz(c.env.DB, c.get('userId'), idOf(c.req.param('id')))));
