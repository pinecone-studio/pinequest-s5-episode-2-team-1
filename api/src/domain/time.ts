import { GAME } from '../config/game';

const DAY_MS = 86_400_000;

/** Тухайн мөчийн Asia/Ulaanbaatar өдөр, 'YYYY-MM-DD'. */
export function ubDay(ms: number, offsetMinutes: number = GAME.TZ_OFFSET_MINUTES): string {
  return new Date(ms + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function dayNumber(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Invalid day: ${day}`);
  return Math.floor(ms / DAY_MS);
}

/** `to` − `from`, хоногоор (to нь хойно бол эерэг). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * DAY_MS).toISOString().slice(0, 10);
}
