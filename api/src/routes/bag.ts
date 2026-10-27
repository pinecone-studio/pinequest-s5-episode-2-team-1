import { Hono } from 'hono';
import { z } from 'zod';
import type { ChestOpenResponse, HintResponse, MeResponse } from '../../../shared/types';
import { SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { openChest, useAmber, useHoney } from '../services/bag';

/** Нууц хайрцаг ба цүнхний хэрэглэгдэхүүн (shared/loot.ts). */
export const bagRoutes = new Hono<AppEnv>();
bagRoutes.use('*', requireAuth);

/** Давсан зангилааны хайрцгийг нээнэ (дахин дуудахад ижил шагнал, давхар олгохгүй). */
bagRoutes.post('/chests', async (c) => {
  const { subject, node } = await readBody(c, z.object({ subject: z.enum(SUBJECTS), node: z.number().int().min(0) }));
  return c.json<ChestOpenResponse>(await openChest(c.env, c.get('userId'), subject, node));
});

/** Зөгийн балны сав: нэг амь нөхнө. */
bagRoutes.post('/honey', async (c) => c.json<MeResponse>(await useHoney(c.env.DB, c.get('userId'))));

/** Хувын болор: даалгаврын хариулаагүй асуултын 2 буруу хариултыг нууна. */
bagRoutes.post('/amber', async (c) => {
  const { taskId, questionId } = await readBody(c, z.object({ taskId: z.number().int().positive(), questionId: z.number().int().positive() }));
  return c.json<HintResponse>(await useAmber(c.env.DB, c.get('userId'), taskId, questionId));
});
