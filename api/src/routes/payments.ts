import { Hono } from 'hono';
import { z } from 'zod';
import { BUYABLE_PLANS } from '../../../shared/plan';
import { GAME } from '../config/game';
import type { PaymentResponse, PaymentsInfoResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { paymentProvider, webhookProvider } from '../payments/provider';
import { checkPayment, createPayment, paymentCallback, paymentWebhook } from '../services/payments';
import { loadMe } from '../services/users';

export const paymentRoutes = new Hono<AppEnv>();

/** Төлбөрийн хуудаснаас буцах апп: хүсэлтийн Origin нь зөвшөөрөгдсөн (эсвэл localhost) бол тэр, үгүй бол kumalearn.online. */
function appOrigin(origin: string | undefined): string {
  const allowed: readonly string[] = GAME.PAYMENTS.APP_ORIGINS;
  if (origin && (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return origin;
  return allowed[0];
}

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
  const urls = { api: new URL(c.req.url).origin, app: appOrigin(c.req.header('origin')) };
  const payment = await createPayment(c.env.DB, provider, c.get('userId'), body.plan, urls);
  return c.json<PaymentResponse>({ payment });
});

/** Төлбөрийн систем дуудна (QPay GET, бусад нь POST байж болно). Хариу нь үргэлж 200: систем дахин дуудаад байхгүй. */
paymentRoutes.on(['GET', 'POST'], '/callback/:id', async (c) => {
  await paymentCallback(c.env.DB, paymentProvider(c.env, c.req.url), paymentId(c.req.param('id')));
  return c.text('SUCCESS');
});

/**
 * Системийн webhook (Wire: нэг тогтмол хаяг). Товч хаалттай (PAYMENT_PROVIDER тохируулаагүй) үед ч ажиллана. Гарын үсэг буруу бол 400 (Wire дахин илгээхгүй), зөв бол 200: төлбөрийг
 * системээс дахин шалгаад багцыг сунгана. endpoint.verification шиг төлбөргүй үйл явдалд зүгээр 200.
 */
paymentRoutes.post('/webhook/:provider', async (c) => {
  const provider = webhookProvider(c.env, c.req.param('provider'));
  if (!provider?.webhook) throw new ApiError(404, 'NOT_FOUND');
  const result = await provider.webhook(await c.req.text(), c.req.raw.headers);
  if (!result) throw new ApiError(400, 'BAD_REQUEST', 'Гарын үсэг буруу');
  if (result.invoiceId) await paymentWebhook(c.env.DB, provider, result.invoiceId);
  return c.json({ received: true });
});

/** Төлөв: төлөгдсөн бол шинэ багцтай me-г хамт буцаана. */
paymentRoutes.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const payment = await checkPayment(c.env.DB, paymentProvider(c.env, c.req.url), userId, paymentId(c.req.param('id')));
  return c.json<PaymentResponse>(payment.status === 'paid' ? { payment, me: await loadMe(c.env.DB, userId) } : { payment });
});
