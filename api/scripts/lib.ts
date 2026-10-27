// seed / bot / e2e скриптүүдийн нийтлэг туслах функцүүд (Node 24: fetch, WebSocket глобал).
import { existsSync, readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiErrorBody } from '../../shared/types';

const here = dirname(fileURLToPath(import.meta.url));

/** `--name value` эсвэл `--name` (→ 'true') */
export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v !== undefined && !v.startsWith('--') ? v : 'true';
}

export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function devVars(): Record<string, string> {
  const p = join(here, '..', '.dev.vars');
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

export const API_URL = (arg('url') ?? process.env.API_URL ?? 'http://localhost:8787').replace(/\/$/, '');
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? devVars().ADMIN_TOKEN;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(`${status} ${code}: ${message}`);
  }
}

export async function call<T>(
  method: string,
  path: string,
  opts: {
    token?: string;
    body?: unknown;
    admin?: boolean;
    /** JSON-ий оронд файлын байт илгээх (books:import). */
    raw?: { data: Uint8Array<ArrayBuffer>; type: string };
    headers?: Record<string, string>;
    /** Хариу хэдэн минут хүлээгдэж болох хүсэлт (Gemini OCR): fetch-ийн 5 минутын хязгааргүй. */
    slow?: boolean;
    /** Даалгавар эхлүүлэхийн өмнө амийг дүүргэхгүй (амийн шалгалтад). */
    keepLives?: boolean;
  } = {},
): Promise<T> {
  // Сценарийн хэрэглэгчид олон даалгавар хийдэг: зангилаа руу орох бүрт амь хасагддаг тул эхлүүлэхийн өмнө дүүргэнэ.
  if (method === 'POST' && path === '/tasks' && opts.token && !opts.keepLives && ADMIN_TOKEN) {
    const { me } = await call<{ me: { id: number } }>('GET', '/me', { token: opts.token });
    await call('POST', `/admin/debug/users/${me.id}/lives`, { admin: true, body: { lives: 5 } });
  }
  const headers: Record<string, string> = { 'content-type': opts.raw?.type ?? 'application/json', ...opts.headers };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.admin && ADMIN_TOKEN) headers['x-admin-token'] = ADMIN_TOKEN;
  const body = opts.raw ? opts.raw.data : opts.body === undefined ? undefined : JSON.stringify(opts.body);
  const res = opts.slow
    ? await slowRequest(API_URL + path, method, headers, body)
    : await fetch(API_URL + path, { method, headers, body }).then(async (r) => ({ ok: r.ok, status: r.status, text: await r.text() }));
  const text = res.text;
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = (data as ApiErrorBody | null)?.error;
    throw new HttpError(res.status, e?.code ?? 'HTTP', e?.message ?? text.slice(0, 200));
  }
  return data as T;
}

/** node:http-ийн хүсэлт хариу хүлээх хугацааны хязгааргүй. Сүлжээний алдааг fetch-тэй адил TypeError болгоно. */
function slowRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | Uint8Array | undefined,
): Promise<{ ok: boolean; status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = (url.startsWith('https:') ? httpsRequest : httpRequest)(url, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('error', reject);
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 300, status, text: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', (e) => reject(new TypeError('fetch failed', { cause: e })));
    req.end(body);
  });
}

/** DuelRoom-ын WebSocket. Token-ийг URL-д биш subprotocol-оор дамжуулна. */
export function openDuelSocket(duelId: number, token: string): WebSocket {
  return new WebSocket(`${API_URL.replace(/^http/, 'ws')}/duels/${duelId}/ws`, ['bearer', token]);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
