import { Hono } from 'hono';
import { z } from 'zod';
import { BUYABLE_PLANS } from '../../../shared/plan';
import type { PaymentResponse, PaymentsInfoResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { paymentProvider } from '../payments/provider';
import { checkPayment, createPayment, paymentCallback } from '../services/payments';
import { loadMe } from '../services/users';

export const paymentRoutes = new Hono<AppEnv>();

const paymentId = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'BAD_REQUEST', 'Буруу дугаар');
  return id;
};

/** Худалдан авалт нээлттэй эсэх: апп товчоо идэвхжүүлэх эсэхээ эндээс мэднэ. */
paymentRoutes.get('/', (c) => c.json<PaymentsInfoResponse>({ open: paymentProvider(c.env, c.req.url) !== null }));

/** Нэхэмжлэл үүсгэнэ: QR, банкны холбоосыг буцаана. */
paymentRoutes.post('/', requireAuth, async (c) => {
  const provider = paymentProvider(c.env, c.req.url);
  if (!provider) throw new ApiError(503, 'PAYMENTS_OFF', 'Төлбөр удахгүй нээгдэнэ');
  const body = await readBody(c, z.object({ plan: z.enum(BUYABLE_PLANS) }));
  const payment = await createPayment(c.env.DB, provider, c.get('userId'), body.plan, new URL(c.req.url).origin);
  return c.json<PaymentResponse>({ payment });
});

/** Төлбөрийн систем дуудна (QPay GET, бусад нь POST байж болно). Хариу нь үргэлж 200: систем дахин дуудаад байхгүй. */
paymentRoutes.on(['GET', 'POST'], '/callback/:id', async (c) => {
  await paymentCallback(c.env.DB, paymentProvider(c.env, c.req.url), paymentId(c.req.param('id')));
  return c.text('SUCCESS');
});

/** Төлөв: төлөгдсөн бол шинэ багцтай me-г хамт буцаана. */
paymentRoutes.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const payment = await checkPayment(c.env.DB, paymentProvider(c.env, c.req.url), userId, paymentId(c.req.param('id')));
  return c.json<PaymentResponse>(payment.status === 'paid' ? { payment, me: await loadMe(c.env.DB, userId) } : { payment });
});
