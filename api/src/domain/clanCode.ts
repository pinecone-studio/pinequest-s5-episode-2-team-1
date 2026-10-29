import { GAME } from '../config/game';

/** Санамсаргүй Уулын урилгын код (зөвхөн цифр: самбар дээр бичиж, кирилл гарнаас ч амархан оруулна). */
export function newClanCode(): string {
  const max = 10 ** GAME.CLAN.CODE_LENGTH;
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % max).padStart(GAME.CLAN.CODE_LENGTH, '0');
}

/** Хэрэглэгчийн бичсэн кодоос зай, зураас зэргийг хасна; урт нь таарахгүй бол null. */
export function normalizeClanCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length === GAME.CLAN.CODE_LENGTH ? digits : null;
}
