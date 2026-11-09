import { describe, expect, it } from 'vitest';
import { raceStatus } from '../../shared/league';
import { modeGrade } from '../src/services/league';
import { weekWinners } from '../src/services/leagueWeek';

describe('league grade', () => {
  it('is the most common grade, lower one on a tie', () => {
    expect(modeGrade([{ grade: 7, n: 2 }, { grade: 6, n: 5 }])).toBe(6);
    expect(modeGrade([{ grade: 8, n: 3 }, { grade: 7, n: 3 }])).toBe(7);
    expect(modeGrade([])).toBeNull();
  });
});

describe('raceStatus', () => {
  const c = (rank: number, weekXp: number, isMine = false) => ({ rank, weekXp, isMine });
  it('leader sees the gap to 2nd, chaser sees XP to pass the clan above', () => {
    expect(raceStatus([c(1, 12, true), c(2, 5)])).toEqual({ kind: 'lead', gap: 7 });
    expect(raceStatus([c(1, 0), c(2, 0, true)])).toEqual({ kind: 'chase', rank: 1, need: 1 });
    expect(raceStatus([c(1, 9), c(2, 4), c(3, 1, true)])).toEqual({ kind: 'chase', rank: 2, need: 4 });
    // 10-аас доош байвал жагсаалтын сүүлд орлуулагдсан: дээд анги нь 9-р байр
    expect(raceStatus([c(9, 6), c(14, 2, true)])).toEqual({ kind: 'chase', rank: 9, need: 5 });
  });
  it('alone or missing', () => {
    expect(raceStatus([c(1, 3, true)])).toEqual({ kind: 'alone' });
    expect(raceStatus([c(1, 3)])).toBeNull();
  });
});

describe('weekWinners', () => {
  const s = (id: number, week_xp: number, league_tier = 1, xp = 0) =>
    ({ id, public_id: `p${id}`, name: `c${id}`, league_tier, icon: null, promoted_week: null, members: 1, xp, week_xp });
  const grade = (map: Record<number, number>) => (id: number) => map[id] ?? null;
  it('promotes the 1st of each grade that actually raced', () => {
    const g = grade({ 1: 8, 2: 8, 3: 9, 4: 9, 5: 7 });
    // 8-р анги: 2 нь түрүүлнэ; 9-р анги: тэнцвэл нийт өндрөөр 4; 7-р анги ганцаараа тул дэвшихгүй
    expect(weekWinners([s(1, 3), s(2, 7), s(3, 5, 1, 10), s(4, 5, 1, 20), s(5, 9)], g).sort()).toEqual([2, 4]);
  });
  it('needs XP and stops at the top league', () => {
    const g = grade({ 1: 8, 2: 8, 3: 9, 4: 9 });
    expect(weekWinners([s(1, 0), s(2, 0), s(3, 4, 6), s(4, 1)], g)).toEqual([]);
  });
});
