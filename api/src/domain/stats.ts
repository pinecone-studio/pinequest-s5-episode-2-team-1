import { addDays } from './time';

/** `today` хүртэлх сүүлийн `n` өдөр, хуучнаас шинэ рүү. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

/** SQL-ийн `GROUP BY day` мөрүүдийг `days`-ийн дарааллаар; мөргүй өдөр 0. */
export function countsByDay(days: string[], rows: Array<{ day: string; n: number }>): number[] {
  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  return days.map((d) => byDay.get(d) ?? 0);
}

/** UB өдрийн эхлэх мөч (epoch ms). */
export function ubDayStart(day: string, offsetMinutes: number): number {
  return Date.parse(`${day}T00:00:00Z`) - offsetMinutes * 60_000;
}
