import { describe, expect, it } from 'vitest';
import { countsByDay, lastDays, ubDayStart } from '../src/domain/stats';
import { ubDay } from '../src/domain/time';

describe('lastDays', () => {
  it('өнөөдрөөр дуусна, хуучнаас шинэ рүү', () => {
    expect(lastDays('2026-11-02', 4)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('1 өдөр = зөвхөн өнөөдөр', () => {
    expect(lastDays('2026-10-26', 1)).toEqual(['2026-10-26']);
  });
});

describe('countsByDay', () => {
  it('мөргүй өдөр 0, хүрээнээс гадуурхыг хаяна', () => {
    const days = ['2026-10-24', '2026-10-25', '2026-10-26'];
    const rows = [
      { day: '2026-10-26', n: 5 },
      { day: '2026-10-24', n: 2 },
      { day: '2026-10-20', n: 9 },
    ];
    expect(countsByDay(days, rows)).toEqual([2, 0, 5]);
  });
});

describe('ubDayStart', () => {
  it('UB шөнө дунд = өмнөх өдрийн UTC 16:00', () => {
    const start = ubDayStart('2026-10-26', 8 * 60);
    expect(new Date(start).toISOString()).toBe('2026-10-25T16:00:00.000Z');
    expect(ubDay(start, 8 * 60)).toBe('2026-10-26');
    expect(ubDay(start - 1, 8 * 60)).toBe('2026-10-25');
  });
});
