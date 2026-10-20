import { GAME } from '../config/game';

const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 'pbkdf2$<iterations>$<salt b64>$<hash b64>' — iteration-ийн тоог hash дотор хадгална. */
export async function hashPassword(password: string, iterations: number = GAME.AUTH.PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, saltB64, hashB64] = stored.split('$');
  const iterations = Number(iter);
  if (scheme !== 'pbkdf2' || !saltB64 || !hashB64 || !Number.isInteger(iterations) || iterations <= 0) return false;
  const actual = await pbkdf2(password, fromB64(saltB64), iterations);
  return constantTimeEqual(actual, fromB64(hashB64));
}

/** 32 байт санамсаргүй, base64url. Клиентэд л очно; DB-д зөвхөн SHA-256 нь хадгалагдана. */
export function newSessionToken(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeUsername(raw: string): string {
  return raw.normalize('NFC').trim().toLowerCase();
}

const USERNAME_RE = /^[\p{L}\p{N}_]+$/u;

/** Normalize хийсэн нэрийг шалгана; алдааны тайлбар эсвэл null. */
export function usernameError(username: string): string | null {
  const len = [...username].length;
  if (len < GAME.AUTH.USERNAME_MIN || len > GAME.AUTH.USERNAME_MAX) {
    return `Нэр ${GAME.AUTH.USERNAME_MIN}–${GAME.AUTH.USERNAME_MAX} тэмдэгт байна`;
  }
  if (!USERNAME_RE.test(username)) return 'Нэрэнд зөвхөн үсэг, тоо, доогуур зураас (_) орно';
  return null;
}
