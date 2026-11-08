import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game';
import type { Bindings } from '../src/env';
import { mockProvider, paymentProvider, type PaymentProvider } from '../src/payments/provider';
import { checkPayment, createPayment, paymentCallback, paymentWebhook } from '../src/services/payments';

type Value = string | number | null;
const DAY = 24 * 60 * 60_000;
const now = Date.UTC(2026, 10, 9);
const URLS = { api: 'https://api.test', app: 'https://app.test' };

function setup() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, dir), 'utf8'));

  function prepare(query: string) {
    const statement = sql.prepare(query);
    let args: Value[] = [];
    const execute = () => ({ meta: { changes: Number((statement.run(...args) as { changes: number | bigint }).changes) } });
    return {
      bind(...values: Value[]) {
        args = values;
        return this;
      },
      first: async () => statement.get(...args) ?? null,
      all: async () => ({ results: statement.all(...args) }),
      run: async () => execute(),
      execute,
    };
  }

  const db = {
    prepare,
    batch: async (statements: ReturnType<typeof prepare>[]) => {
      sql.exec('BEGIN');
      try {
        const results = statements.map((s) => s.execute());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;

  sql.exec("INSERT INTO users (username, password_hash, grade, tier, created_at) VALUES ('a', 'x', 6, 1, 0), ('b', 'x', 6, 1, 0)");
  const user = (id = 1) => sql.prepare('SELECT plan, plan_until FROM users WHERE id = ?').get(id) as { plan: string; plan_until: number | null };
  const payment = (id: number) => sql.prepare('SELECT status, invoice_id, paid_at FROM payments WHERE id = ?').get(id) as {
    status: string;
    invoice_id: string | null;
    paid_at: number | null;
  };
  return { db, sql, user, payment };
}

/** Төлөгдсөн эсэхийг тест өөрөө шийддэг систем. */
function fakeProvider(paid = false): PaymentProvider & { paid: boolean; invoices: number } {
  const p = {
    name: 'fake',
    paid,
    invoices: 0,
    createInvoice: async ({ paymentId }: { paymentId: number }) => {
      p.invoices++;
      return { invoiceId: `inv-${paymentId}`, qrImage: 'png', links: [{ name: 'Bank', link: 'bank://pay' }] };
    },
    isPaid: async () => p.paid,
  };
  return p;
}

describe('createPayment', () => {
  it('stores a pending payment with the invoice and returns the QR', async () => {
    const { db, payment } = setup();
    const res = await createPayment(db, fakeProvider(), 1, 'plus', URLS, now);
    expect(res).toMatchObject({ id: 1, plan: 'plus', amount: 15_000, status: 'pending', qrImage: 'png' });
    expect(payment(1)).toMatchObject({ status: 'pending', invoice_id: 'inv-1' });
  });

  it('marks the payment failed when the provider errors', async () => {
    const { db, payment } = setup();
    const broken = { ...fakeProvider(), createInvoice: async () => Promise.reject(new Error('down')) };
    await expect(createPayment(db, broken, 1, 'plus', URLS, now)).rejects.toMatchObject({ code: 'PAYMENT_FAILED' });
    expect(payment(1).status).toBe('failed');
  });

  it('limits invoices per hour', async () => {
    const { db } = setup();
    const p = fakeProvider();
    for (let i = 0; i < GAME.PAYMENTS.MAX_PER_HOUR; i++) await createPayment(db, p, 1, 'plus', URLS, now);
    await expect(createPayment(db, p, 1, 'plus', URLS, now)).rejects.toMatchObject({ code: 'PAYMENT_LIMIT' });
    await createPayment(db, p, 1, 'plus', URLS, now + 60 * 60_000 + 1);
  });
});

describe('checkPayment', () => {
  it('stays pending until the provider says paid, then grants 30 days of plus', async () => {
    const { db, user, payment } = setup();
    const p = fakeProvider();
    await createPayment(db, p, 1, 'plus', URLS, now);
    expect((await checkPayment(db, p, 1, 1, now)).status).toBe('pending');
    expect(user()).toEqual({ plan: 'free', plan_until: null });

    p.paid = true;
    expect((await checkPayment(db, p, 1, 1, now + 1000)).status).toBe('paid');
    expect(user()).toEqual({ plan: 'plus', plan_until: now + 1000 + 30 * DAY });
    expect(payment(1).paid_at).toBe(now + 1000);
  });

  it('grants the plan only once when the callback and the app both confirm', async () => {
    const { db, user } = setup();
    const p = fakeProvider(true);
    await createPayment(db, p, 1, 'plus', URLS, now);
    await paymentCallback(db, p, 1, now);
    await paymentCallback(db, p, 1, now);
    await checkPayment(db, p, 1, 1, now);
    expect(user().plan_until).toBe(now + 30 * DAY);
  });

  it('extends an active plus from its end, an expired one from now', async () => {
    const { db, sql, user } = setup();
    const p = fakeProvider(true);
    sql.exec(`UPDATE users SET plan = 'plus', plan_until = ${now + 5 * DAY} WHERE id = 1`);
    await createPayment(db, p, 1, 'plus', URLS, now);
    await checkPayment(db, p, 1, 1, now);
    expect(user().plan_until).toBe(now + 35 * DAY);

    sql.exec(`UPDATE users SET plan = 'plus', plan_until = ${now - DAY} WHERE id = 2`);
    await createPayment(db, p, 2, 'plus', URLS, now);
    await checkPayment(db, p, 2, 2, now);
    expect(user(2).plan_until).toBe(now + 30 * DAY);
  });

  it("hides another user's payment", async () => {
    const { db } = setup();
    const p = fakeProvider(true);
    await createPayment(db, p, 1, 'plus', URLS, now);
    await expect(checkPayment(db, p, 2, 1, now)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('does not ask a different provider than the one that made the invoice', async () => {
    const { db, user } = setup();
    await createPayment(db, fakeProvider(), 1, 'plus', URLS, now);
    expect((await checkPayment(db, { ...fakeProvider(true), name: 'other' }, 1, 1, now)).status).toBe('pending');
    expect((await checkPayment(db, null, 1, 1, now)).status).toBe('pending');
    expect(user().plan).toBe('free');
  });

  it('keeps the payment pending when the provider check fails', async () => {
    const { db } = setup();
    const p = { ...fakeProvider(), isPaid: async () => Promise.reject(new Error('down')) };
    await createPayment(db, p, 1, 'plus', URLS, now);
    expect((await checkPayment(db, p, 1, 1, now)).status).toBe('pending');
  });
});

describe('return URLs and webhook', () => {
  it('sends the app return URLs to the provider', async () => {
    const { db } = setup();
    let seen: { successUrl?: string; cancelUrl?: string; callbackUrl?: string } = {};
    const p = { ...fakeProvider(), createInvoice: async (r: { paymentId: number; successUrl: string; cancelUrl: string; callbackUrl: string }) => ((seen = r), { invoiceId: 'inv-1', checkoutUrl: 'https://pay.test/c/1' }) };
    const res = await createPayment(db, p, 1, 'plus', URLS, now);
    expect(seen).toMatchObject({ successUrl: 'https://app.test/pay?payment=1', cancelUrl: 'https://app.test/plans', callbackUrl: 'https://api.test/payments/callback/1' });
    expect(res.checkoutUrl).toBe('https://pay.test/c/1');
  });

  it('finds the payment by the provider invoice id and re-checks it', async () => {
    const { db, user, payment } = setup();
    const p = fakeProvider(true);
    await createPayment(db, p, 1, 'plus', URLS, now);
    await paymentWebhook(db, { ...p, name: 'other' }, 'inv-1', now);
    expect(payment(1).status).toBe('pending');
    await paymentWebhook(db, p, 'inv-unknown', now);
    await paymentWebhook(db, p, 'inv-1', now);
    expect(payment(1).status).toBe('paid');
    expect(user().plan).toBe('plus');
  });
});

describe('paymentProvider', () => {
  const env = (PAYMENT_PROVIDER?: string) => ({ PAYMENT_PROVIDER }) as Bindings;
  it('is closed when no provider is set', () => {
    expect(paymentProvider(env(), 'https://surgalt-api.example/payments')).toBeNull();
    expect(paymentProvider(env(''), 'http://localhost:8787/payments')).toBeNull();
  });
  it('opens Wire only when both keys are set', () => {
    const wire = (k?: string, w?: string) => ({ PAYMENT_PROVIDER: 'wire', WIRE_SECRET_KEY: k, WIRE_WEBHOOK_SECRET: w }) as Bindings;
    expect(paymentProvider(wire('sk_live_x'), 'https://api.example/payments')).toBeNull();
    expect(paymentProvider(wire(undefined, 'whsec_x'), 'https://api.example/payments')).toBeNull();
    expect(paymentProvider(wire('sk_live_x', 'whsec_x'), 'https://api.example/payments')?.name).toBe('wire');
  });
  it('allows the mock provider only on localhost', () => {
    expect(paymentProvider(env('mock'), 'http://localhost:8787/payments')).toBe(mockProvider);
    expect(paymentProvider(env('mock'), 'https://surgalt-api.example/payments')).toBeNull();
  });
});
