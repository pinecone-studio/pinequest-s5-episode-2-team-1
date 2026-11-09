import { PLAN_PERIOD_DAYS, PLAN_PRICE, PLAN_NAMES, type BuyablePlan } from '../../../shared/plan';
import type { Payment, PaymentStatus } from '../../../shared/types';
import { GAME } from '../config/game';
import { ApiError } from '../lib/errors';
import type { PaymentProvider } from '../payments/provider';

// Багцын төлбөр: нэхэмжлэл үүсгэх, төлөгдсөн эсэхийг шалгах, төлөгдвөл багцыг сунгах.

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;

export interface PaymentRow {
  id: number;
  user_id: number;
  plan: BuyablePlan;
  amount: number;
  days: number;
  provider: string;
  invoice_id: string | null;
  status: PaymentStatus;
}

const view = (p: PaymentRow): Payment => ({ id: p.id, plan: p.plan, amount: p.amount, status: p.status });

/** Нэхэмжлэл үүсгэнэ: эхлээд pending мөр, дараа нь төлбөрийн системд. Систем алдаа өгвөл мөр failed болно. */
export async function createPayment(
  db: D1Database,
  provider: PaymentProvider,
  userId: number,
  plan: BuyablePlan,
  urls: { api: string; app: string },
  now = Date.now(),
  /** Туршилтын дүн (routes: зөвхөн admin, PAYMENT_TEST_AMOUNT). Өгөөгүй бол багцын үнэ. */
  testAmount?: number,
): Promise<Payment> {
  const recent = await db
    .prepare('SELECT COUNT(*) AS n FROM payments WHERE user_id = ? AND created_at > ?')
    .bind(userId, now - HOUR_MS)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= GAME.PAYMENTS.MAX_PER_HOUR) {
    throw new ApiError(429, 'PAYMENT_LIMIT', 'Хэт олон оролдлого');
  }

  const amount = testAmount ?? PLAN_PRICE[plan];
  const row = await db
    .prepare(
      `INSERT INTO payments (user_id, plan, amount, days, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id, user_id, plan, amount, days, provider, invoice_id, status`,
    )
    .bind(userId, plan, amount, PLAN_PERIOD_DAYS, provider.name, now)
    .first<PaymentRow>();
  if (!row) throw new ApiError(500, 'INTERNAL');

  try {
    const invoice = await provider.createInvoice({
      paymentId: row.id,
      amount,
      description: `${PLAN_NAMES[plan]} ${PLAN_PERIOD_DAYS} хоног${testAmount === undefined ? '' : ' (туршилт)'}`,
      callbackUrl: `${urls.api}/payments/callback/${row.id}`,
      successUrl: `${urls.app}/pay?payment=${row.id}`,
      cancelUrl: `${urls.app}/plans`,
    });
    await db.prepare('UPDATE payments SET invoice_id = ? WHERE id = ?').bind(invoice.invoiceId, row.id).run();
    return { ...view(row), qrImage: invoice.qrImage, qrText: invoice.qrText, links: invoice.links, checkoutUrl: invoice.checkoutUrl };
  } catch {
    await db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").bind(row.id).run();
    throw new ApiError(502, 'PAYMENT_FAILED', 'Төлбөрийн системтэй холбогдсонгүй');
  }
}

/**
 * Төлөгдсөн гэж тэмдэглээд багцыг сунгана. Нэг batch (transaction): хоёр мөр хоёулаа status = 'pending' үед л өөрчлөгдөнө,
 * тиймээс callback, шалгалт зэрэг давхар ирсэн ч багц нэг л удаа сунгагдана.
 * Сунгалт: ижил багцтай, хугацаа нь дуусаагүй бол дуусах өдрөөс, үгүй бол одооноос. Хугацаагүй (NULL) ижил багц хэвээр.
 */
export async function confirmPayment(db: D1Database, p: PaymentRow, now = Date.now()): Promise<boolean> {
  const [user, payment] = await db.batch([
    db
      .prepare(
        `UPDATE users SET
           plan_until = CASE
             WHEN plan = ? AND plan_until IS NULL THEN NULL
             ELSE MAX(CASE WHEN plan = ? THEN plan_until ELSE 0 END, ?) + ?
           END,
           plan = ?
         WHERE id = ? AND EXISTS (SELECT 1 FROM payments WHERE id = ? AND status = 'pending')`,
      )
      .bind(p.plan, p.plan, now, p.days * DAY_MS, p.plan, p.user_id, p.id),
    db.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'").bind(now, p.id),
  ]);
  return user.meta.changes > 0 && payment.meta.changes > 0;
}

/** Төлбөрийн системээс асууж, төлөгдсөн бол багцыг сунгана. Систем хариу өгөхгүй бол pending хэвээр. */
async function settle(db: D1Database, provider: PaymentProvider | null, p: PaymentRow, now: number): Promise<PaymentRow> {
  if (p.status !== 'pending' || !p.invoice_id || !provider || provider.name !== p.provider) return p;
  const paid = await provider.isPaid(p.invoice_id).catch(() => false);
  if (!paid) return p;
  await confirmPayment(db, p, now);
  return { ...p, status: 'paid' };
}

const SELECT_PAYMENT = 'SELECT id, user_id, plan, amount, days, provider, invoice_id, status FROM payments WHERE id = ?';

/** Апп төлбөрийн төлвийг асууна (QR харуулж байх үед хэдэн секунд тутам). */
export async function checkPayment(
  db: D1Database,
  provider: PaymentProvider | null,
  userId: number,
  paymentId: number,
  now = Date.now(),
): Promise<Payment> {
  const row = await db.prepare(`${SELECT_PAYMENT} AND user_id = ?`).bind(paymentId, userId).first<PaymentRow>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Төлбөр олдсонгүй');
  return view(await settle(db, provider, row, now));
}

/** Төлбөрийн системийн callback: биеийг нь итгэхгүй, системээс өөрөөс нь дахин шалгана. */
export async function paymentCallback(db: D1Database, provider: PaymentProvider | null, paymentId: number, now = Date.now()) {
  const row = await db.prepare(SELECT_PAYMENT).bind(paymentId).first<PaymentRow>();
  if (row) await settle(db, provider, row, now);
}

/** Системийн webhook: тухайн системийн нэхэмжлэлийг олоод (биеийг итгэхгүй) системээс дахин шалгана. */
export async function paymentWebhook(db: D1Database, provider: PaymentProvider, invoiceId: string, now = Date.now()) {
  const row = await db
    .prepare('SELECT id, user_id, plan, amount, days, provider, invoice_id, status FROM payments WHERE provider = ? AND invoice_id = ?')
    .bind(provider.name, invoiceId)
    .first<PaymentRow>();
  if (row) await settle(db, provider, row, now);
}

/**
 * Жинхэнэ мөнгөөр бага дүнгээр турших (Wire-д туршилтын горим байхгүй): PAYMENT_TEST_AMOUNT тавьсан үед зөвхөн admin-ий
 * нэхэмжлэл тэр дүнтэй. Бусад хэрэглэгч, эсвэл тохиргоо буруу бол undefined (багцын үнэ).
 */
export async function paymentTestAmount(setting: string | undefined, db: D1Database, userId: number): Promise<number | undefined> {
  const amount = Number(setting);
  if (!setting || !Number.isInteger(amount) || amount <= 0) return undefined;
  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first<{ is_admin: number }>();
  return user?.is_admin === 1 ? amount : undefined;
}
