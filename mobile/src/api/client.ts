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

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return errorMessages.INTERNAL;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
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
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, code, errorMessages[code] ?? errorMessages.INTERNAL);
  }
  return data as T;
}

/** DuelRoom-ын WebSocket хаяг. Браузерын WebSocket header дамжуулдаггүй тул token query-д. */
export function wsUrl(path: string): string {
  return `${API_URL.replace(/^http/, 'ws')}${path}?token=${encodeURIComponent(authToken ?? '')}`;
}
