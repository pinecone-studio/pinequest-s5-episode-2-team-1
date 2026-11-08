import { describe, expect, it } from 'vitest';
import { verifyWireSignature, wireProvider } from '../src/payments/wire';

const SECRET = 'whsec_test';

async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const signed = async (body: string, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${t},v1=${await hmac(secret, `${t}.${body}`)}`;

/** Wire API-г дуурайх fetch: дуудлагуудыг бичиж, өгсөн хариуг буцаана. */
function fakeWire(responses: Record<string, unknown>, status = 200) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined });
    const path = url.replace('https://api.wire.mn/v1', '');
    const key = Object.keys(responses).find((k) => path.startsWith(k));
    return new Response(JSON.stringify(key ? responses[key] : {}), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const req = { paymentId: 7, amount: 15000, description: 'KUMA Plus 30 хоног', callbackUrl: 'https://api/x', successUrl: 'https://app/pay?payment=7', cancelUrl: 'https://app/plans' };

describe('wireProvider', () => {
  it('creates a PaymentIntent and a hosted checkout session', async () => {
    const { calls, fetchImpl } = fakeWire({ '/payment_intents': { id: 'pi_1', status: 'requires_payment_method' }, '/checkout/sessions': { id: 'cs_1', url: 'https://pay.wire.mn/c/cs_1' } });
    const inv = await wireProvider('sk_live_k', SECRET, fetchImpl).createInvoice(req);
    expect(inv).toEqual({ invoiceId: 'pi_1', checkoutUrl: 'https://pay.wire.mn/c/cs_1' });
    expect(calls[0]).toMatchObject({
      url: 'https://api.wire.mn/v1/payment_intents',
      method: 'POST',
      headers: { authorization: 'Bearer sk_live_k', 'content-type': 'application/json', 'idempotency-key': 'kuma-pay-7' },
      body: { amount: 15000, currency: 'MNT', description: 'KUMA Plus 30 хоног', metadata: { payment_id: '7' } },
    });
    expect(calls[1]).toMatchObject({
      url: 'https://api.wire.mn/v1/checkout/sessions',
      headers: { 'idempotency-key': 'kuma-pay-7-checkout' },
      body: { payment_intent: 'pi_1', success_url: 'https://app/pay?payment=7', cancel_url: 'https://app/plans' },
    });
  });

  it('throws when Wire answers with an error', async () => {
    const { fetchImpl } = fakeWire({}, 403);
    await expect(wireProvider('sk_live_k', SECRET, fetchImpl).createInvoice(req)).rejects.toThrow('403');
  });

  it('is paid only when the intent succeeded', async () => {
    for (const [status, paid] of [['succeeded', true], ['requires_payment_method', false], ['processing', false], ['canceled', false]] as const) {
      const { calls, fetchImpl } = fakeWire({ '/payment_intents/pi_1': { id: 'pi_1', status } });
      expect(await wireProvider('sk_live_k', SECRET, fetchImpl).isPaid('pi_1')).toBe(paid);
      expect(calls[0]).toMatchObject({ url: 'https://api.wire.mn/v1/payment_intents/pi_1', method: 'GET' });
    }
  });
});

describe('Wire webhook', () => {
  const body = JSON.stringify({ id: 'evt_1', object: 'event', type: 'payment_intent.succeeded', data: { id: 'pi_1', status: 'succeeded' } });
  const hook = (header: string) => wireProvider('sk_live_k', SECRET).webhook!(body, new Headers({ 'WirePayment-Signature': header }));

  it('accepts a valid signature and returns the intent id', async () => {
    expect(await hook(await signed(body))).toEqual({ invoiceId: 'pi_1' });
  });

  it('rejects a wrong secret, a changed body or an old timestamp', async () => {
    expect(await hook(await signed(body, undefined, 'whsec_other'))).toBeNull();
    expect(await hook(await signed(body.replace('pi_1', 'pi_2')))).toBeNull();
    expect(await hook(await signed(body, Math.floor(Date.now() / 1000) - 301))).toBeNull();
    expect(await hook('')).toBeNull();
  });

  it('accepts the verification ping without a payment', async () => {
    const ping = JSON.stringify({ id: 'evt_0', object: 'event', type: 'endpoint.verification', data: {} });
    const res = await wireProvider('sk_live_k', SECRET).webhook!(ping, new Headers({ 'WirePayment-Signature': await signed(ping) }));
    expect(res).toEqual({ invoiceId: null });
  });

  it('accepts any of several v1 signatures (secret rotation)', async () => {
    const t = Math.floor(Date.now() / 1000);
    expect(await verifyWireSignature(`t=${t},v1=deadbeef,v1=${await hmac(SECRET, `${t}.${body}`)}`, body, SECRET)).toBe(true);
  });
});
