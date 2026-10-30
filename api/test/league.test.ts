import { describe, expect, it } from 'vitest';
import { modeGrade } from '../src/services/league';

describe('league grade', () => {
  it('is the most common grade, lower one on a tie', () => {
    expect(modeGrade([{ grade: 7, n: 2 }, { grade: 6, n: 5 }])).toBe(6);
    expect(modeGrade([{ grade: 8, n: 3 }, { grade: 7, n: 3 }])).toBe(7);
    expect(modeGrade([])).toBeNull();
  });
});
