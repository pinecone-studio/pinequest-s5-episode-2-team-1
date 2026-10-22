import type { ApiErrorBody, ErrorCode } from '@shared/types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { errorMessages } from '@/i18n/strings';

const API_PORT = 8787;
const TIMEOUT_MS = 15_000;

/**
 * 1) EXPO_PUBLIC_API_URL (mobile/.env) байвал түүнийг.
 * 2) Үгүй бол Expo Go-ийн Metro host IP (= компьютерийн LAN IP) дээрх 8787 порт.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

export type ClientErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// globalThis дээр хадгална: Fast Refresh модулийг дахин ажиллуулахад session алдагдахгүй.
const session = ((globalThis as { __surgaltSession?: { token: string | null; onUnauthorized: (() => void) | null } }).__surgaltSession ??=
  { token: null, onUnauthorized: null });

export function setAuthToken(token: string | null) {
  session.token = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  session.onUnauthorized = handler;
}

/** Баавгайтай ярилцах (Gemini Live relay). questionId байхгүй бол сүүлд алдсан бодлогуудын тухай. */
export function openTutorSocket(questionId?: number): WebSocket {
  const query = questionId === undefined ? '' : `?questionId=${questionId}`;
  return new WebSocket(`${API_URL.replace(/^http/, 'ws')}/tutor/ws${query}`, ['bearer', session.token ?? '']);
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return errorMessages.INTERNAL;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const tokenUsed = session.token;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers: {
        'content-type': 'application/json',
        ...(tokenUsed ? { authorization: `Bearer ${tokenUsed}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch {
    const code = controller.signal.aborted ? 'TIMEOUT' : 'NETWORK';
    throw new ApiError(0, code, errorMessages[code]);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = (data as ApiErrorBody | null)?.error?.code ?? 'INTERNAL';
    // Зөвхөн одоогийн token татгалзагдсан бол гаргана (хуучин/хоосон token-той хүсэлт тооцохгүй).
    if (res.status === 401 && tokenUsed && tokenUsed === session.token) session.onUnauthorized?.();
    throw new ApiError(res.status, code, errorMessages[code] ?? errorMessages.INTERNAL);
  }
  return data as T;
}

/** DuelRoom-ын WebSocket. Token-ийг URL-д (log-д) биш subprotocol-оор дамжуулна. */
export function openDuelSocket(duelId: number): WebSocket {
  return new WebSocket(`${API_URL.replace(/^http/, 'ws')}/duels/${duelId}/ws`, ['bearer', session.token ?? '']);
}
