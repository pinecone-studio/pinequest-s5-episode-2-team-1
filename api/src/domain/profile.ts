import type { BearLook } from '../../../shared/types';
import { DEFAULT_LOOK } from '../config/cosmetics';
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
      const { bg, outfit } = v as Partial<Record<keyof BearLook, unknown>>;
      return {
        bg: typeof bg === 'string' ? bg : DEFAULT_LOOK.bg,
        outfit: typeof outfit === 'string' ? outfit : DEFAULT_LOOK.outfit,
      };
    }
  } catch {
    // доор анхдагч
  }
  return { ...DEFAULT_LOOK };
}
