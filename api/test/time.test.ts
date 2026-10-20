import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, ubDay } from '../src/domain/time';

describe('ubDay (UTC+8)', () => {
  it('UTC 15:59:59 нь UB-ийн мөн өдрийн 23:59:59', () => {
    expect(ubDay(Date.parse('2026-10-20T15:59:59.999Z'))).toBe('2026-10-20');
  });

  it('UTC 16:00:00 нь UB-ийн дараагийн өдрийн 00:00', () => {
    expect(ubDay(Date.parse('2026-10-20T16:00:00.000Z'))).toBe('2026-10-21');
  });

  it('UTC шөнө дунд UB-д өглөөний 8 цаг, мөн өдөр', () => {
    expect(ubDay(Date.parse('2026-10-21T00:00:00Z'))).toBe('2026-10-21');
  });

  it('оны хил', () => {
    expect(ubDay(Date.parse('2026-12-31T16:00:00Z'))).toBe('2027-01-01');
  });
});

describe('daysBetween / addDays', () => {
  it('сарын хил дамнана', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('өндөр жил', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('урвуу дараалал сөрөг', () => {
    expect(daysBetween('2026-10-21', '2026-10-20')).toBe(-1);
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });
});
