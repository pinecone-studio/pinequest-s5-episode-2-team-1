import { Hono } from 'hono';
import { z } from 'zod';
import type { AssignmentsResponse, AssignmentView } from '../../../shared/assignment';
import type { AppEnv } from '../env';
import { parseId, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { answerAssignment, assignmentView, myAssignments } from '../services/assignmentPlay';

/** Багшийн даалгавар (сурагч): ангийн нээлттэй даалгаврууд, нэгийг дарааллаар нь хийх. */
export const assignmentRoutes = new Hono<AppEnv>();
assignmentRoutes.use('*', requireAuth);

assignmentRoutes.get('/', async (c) => c.json<AssignmentsResponse>(await myAssignments(c.env.DB, c.get('userId'))));

assignmentRoutes.get('/:id', async (c) => c.json<AssignmentView>(await assignmentView(c.env.DB, c.get('userId'), parseId(c.req.param('id')))));

assignmentRoutes.post('/:id/answer', async (c) => {
  const body = await readBody(c, z.object({ position: z.number().int().min(0), choice: z.number().int().min(0).max(3) }));
  return c.json<AssignmentView>(await answerAssignment(c.env.DB, c.get('userId'), parseId(c.req.param('id')), body.position, body.choice));
});
