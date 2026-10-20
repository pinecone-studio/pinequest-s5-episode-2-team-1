import type { Me } from '@shared/types';
import type { SpriteKey } from '@/sprites';
import { dayDiff } from './bear';

// Хичээлийн хуанли (DESIGN.md §8-08). Backend өдөр бүрийн түүх хадгалдаггүй тул зөвхөн мэдэгдэж
// буй өгөгдлөөс зурна: өнөөдөр, одоогийн дараалал (streak) үргэлжилсэн өдрүүд, дараалал тасарсан өдөр,
// хамгаалалт ашигласан өдөр. Мэдэгдэхгүй өнгөрсөн өдрүүд зөвхөн дугаартай хоосон үлдэнэ.

export type DayFace = 'happy' | 'idle' | 'tired' | 'neglected' | 'rest';

export const FACE: Record<DayFace, { sprite: SpriteKey; bg: string }> = {
  happy: { sprite: 'head_happy_52x34', bg: '#F3F66C' },
  idle: { sprite: 'head_idle_40x34', bg: '#D4F55E' },
  tired: { sprite: 'head_tired_40x34', bg: '#D9D2F2' },
  neglected: { sprite: 'head_neglected_40x34', bg: '#CBCAC1' },
  rest: { sprite: 'head_sleep_54x34', bg: '#AEDDF3' },
};

export interface CalendarCell {
  key: string;
  day: number | null;
  date: string | null;
  face: DayFace | null;
  future: boolean;
  today: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

/** Тогтмол "санамсаргүй" (өдөр бүрт ижил): сурсан өдрийн царайг гэрэлтсэн/хэвийн гэж ялгахад. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function faceFor(me: Me, date: string): DayFace | null {
  const diff = dayDiff(me.today, date);
  if (diff < 0) return null;
  if (me.shield.usedDay === date) return 'rest';
  // Өнөөдөр сурсан бол дараалал өнөөдрийг багтаана; үгүй бол өчигдрөөр дуусна
  const runStart = me.streakDoneToday ? 0 : 1;
  const runEnd = runStart + me.streak - 1;
  if (me.streak > 0 && diff >= runStart && diff <= runEnd) {
    if (diff === 0) return me.streak >= 7 ? 'happy' : 'idle';
    return hash(`${me.id}:${date}`) % 3 === 0 ? 'idle' : 'happy';
  }
  if (diff === 0) return null; // өнөөдөр хараахан сураагүй
  // Дараалал тасарсан өдөр (өмнө нь сурч байсан хэрэглэгчид)
  if (me.xp > 0 && diff === runEnd + 1 && diff >= 1) return 'neglected';
  return null;
}

export function buildMonth(me: Me, year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Даваа гарагаас эхэлнэ
  const cells: CalendarCell[] = [];
  for (let k = 0; k < lead; k++) cells.push({ key: `l${k}`, day: null, date: null, face: null, future: false, today: false });
  let studied = 0;
  let rest = 0;
  let missed = 0;
  let elapsed = 0;
  for (let d = 1; d <= days; d++) {
    const date = isoDate(year, month, d);
    const diff = dayDiff(me.today, date);
    const face = faceFor(me, date);
    if (face === 'happy' || face === 'idle') studied++;
    if (face === 'rest') rest++;
    if (face === 'neglected') missed++;
    if (diff >= 0) elapsed++;
    cells.push({ key: date, day: d, date, face, future: diff < 0, today: diff === 0 });
  }
  while (cells.length % 7) cells.push({ key: `t${cells.length}`, day: null, date: null, face: null, future: false, today: false });
  const steady = elapsed > 0 ? Math.round((studied / elapsed) * 100) : 0;
  return { cells, studied, rest, missed, steady };
}
