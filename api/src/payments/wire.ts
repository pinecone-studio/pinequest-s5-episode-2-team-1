import { GAME } from '../config/game';
import type { Invoice, InvoiceRequest, PaymentProvider } from './provider';

// Wire (https://docs.wire.mn): PaymentIntent → hosted checkout (pay.wire.mn). Зөвхөн sk_live_ түлхүүр ажилладаг (туршилтын
// горимгүй). Төлөгдсөн эсэхийг GET /payment_intents/:id-ээр шалгана; webhook нь WirePayment-Signature-тэй.

interface WireIntent {
  id: string;
  status: string;
}
interface WireSession {
  id: string;
  url: string;
}

/** HMAC-SHA256(secret, `${t}.${body}`) hex. */
async function sign(secret: string, t: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ижил урттай хоёр мөрийг тогтмол хугацаанд харьцуулна. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** `t=<unix>,v1=<hex>` гарын үсгийг шалгана (хуучин эсвэл ирээдүйн t-г татгалзана). */
export async function verifyWireSignature(header: string | null, body: string, secret: string, nowMs = Date.now()): Promise<boolean> {
  if (!header) return false;
  const fields = header.split(',').map((kv) => kv.trim());
  const t = fields.find((kv) => kv.startsWith('t='))?.slice(2);
  const v1s = fields.filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  if (!t || !/^\d+$/.test(t) || v1s.length === 0) return false;
  if (Math.abs(nowMs / 1000 - Number(t)) > GAME.PAYMENTS.WEBHOOK_TOLERANCE_S) return false;
  const expected = await sign(secret, t, body);
  return v1s.some((v) => safeEqual(v, expected));
}

export function wireProvider(secretKey: string, webhookSecret: string, fetchImpl: typeof fetch = fetch): PaymentProvider {
  const call = async <T>(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> => {
    const res = await fetchImpl(`${GAME.PAYMENTS.WIRE_API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${secretKey}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(GAME.PAYMENTS.TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`wire ${method} ${path}: ${res.status}`);
    return (await res.json()) as T;
  };

  return {
    name: 'wire',

    async createInvoice(req: InvoiceRequest): Promise<Invoice> {
      // Idempotency-Key: payments.id дээр тогтмол тул дахин оролдсон хүсэлт давхар нэхэмжлэл үүсгэхгүй.
      const intent = await call<WireIntent>(
        'POST',
        '/payment_intents',
        { amount: req.amount, currency: 'MNT', description: req.description, metadata: { payment_id: String(req.paymentId) } },
        `kuma-pay-${req.paymentId}`,
      );
      const session = await call<WireSession>(
        'POST',
        '/checkout/sessions',
        { payment_intent: intent.id, success_url: req.successUrl, cancel_url: req.cancelUrl },
        `kuma-pay-${req.paymentId}-checkout`,
      );
      return { invoiceId: intent.id, checkoutUrl: session.url };
    },

    async isPaid(invoiceId: string): Promise<boolean> {
      const intent = await call<WireIntent>('GET', `/payment_intents/${encodeURIComponent(invoiceId)}`);
      return intent.status === 'succeeded';
    },

    async webhook(rawBody: string, headers: Headers) {
      if (!(await verifyWireSignature(headers.get('wirepayment-signature'), rawBody, webhookSecret))) return null;
      const event = JSON.parse(rawBody) as { type?: string; data?: { id?: string } };
      // endpoint.verification гэх мэт: гарын үсэг зөв, гэхдээ ямар нэг төлбөрийн тухай биш.
      const invoiceId = event.type?.startsWith('payment_intent.') && typeof event.data?.id === 'string' ? event.data.id : null;
      return { invoiceId };
    },
  };
}
