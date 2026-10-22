import { GAME } from '../config/game';

/** Санамсаргүй урилгын код (зөвхөн цифр: хүүхэд кирилл гарнаас ч амархан бичнэ). */
export function newDuelCode(): string {
  const max = 10 ** GAME.DUEL.CODE_LENGTH;
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % max).padStart(GAME.DUEL.CODE_LENGTH, '0');
}

/** Хэрэглэгчийн бичсэн кодоос зай, зураас зэргийг хасна; урт нь таарахгүй бол null. */
export function normalizeDuelCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length === GAME.DUEL.CODE_LENGTH ? digits : null;
}
