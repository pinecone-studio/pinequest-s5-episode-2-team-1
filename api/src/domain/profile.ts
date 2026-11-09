import type { BearLook } from '../../../shared/types';
import { BEAR_FACES, BEAR_FURS, DEFAULT_LOOK } from '../config/cosmetics';
import { GAME } from '../config/game';

/** Санамсаргүй профайлын код (тулааны кодын адил зөвхөн цифр: хүүхэд кирилл гарнаас ч амархан бичнэ). */
export function newProfileCode(): string {
  const max = 10 ** GAME.PROFILE.CODE_LENGTH;
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % max).padStart(GAME.PROFILE.CODE_LENGTH, '0');
}

/** Хэрэглэгчийн бичсэн кодоос зай, зураас зэргийг хасна; урт нь таарахгүй бол null. */
export function normalizeProfileCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length === GAME.PROFILE.CODE_LENGTH ? digits : null;
}

/** users.bear_look (JSON) → харагдац; хоосон эсвэл эвдэрсэн бол анхдагч. */
export function parseBearLook(json: string | null | undefined): BearLook {
  try {
    const v: unknown = JSON.parse(json ?? 'null');
    if (v && typeof v === 'object') {
      const { bg, outfit, fur, face, chest, photo } = v as Partial<Record<keyof BearLook, unknown>>;
      return {
        ...(typeof photo === 'string' && PHOTO_ID.test(photo) ? { photo } : {}),
        bg: typeof bg === 'string' ? bg : DEFAULT_LOOK.bg,
        outfit: typeof outfit === 'string' ? outfit : DEFAULT_LOOK.outfit,
        fur: BEAR_FURS.find((f) => f === fur) ?? DEFAULT_LOOK.fur,
        face: BEAR_FACES.find((f) => f === face) ?? DEFAULT_LOOK.face,
        chest: typeof chest === 'boolean' ? chest : DEFAULT_LOOK.chest,
      };
    }
  } catch {
    // доор анхдагч
  }
  return { ...DEFAULT_LOOK };
}

/** Профайлын зургийн id (R2-ийн `avatars/<id>`): `<userId>-<16 hex>`. */
export const PHOTO_ID = /^\d+-[0-9a-f]{16}$/;

/** Зургийн төрлийг эхний байтаас нь (клиентийн хэлснийг биш) таньна: JPEG, PNG, WebP; бусад нь null. */
export function photoMime(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from: number) => String.fromCharCode(...b.subarray(from, from + 4));
  if (b.length >= 12 && ascii(0) === 'RIFF' && ascii(8) === 'WEBP') return 'image/webp';
  return null;
}
