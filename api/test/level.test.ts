import { describe, expect, it } from 'vitest';
import { levelFromXp, levelProgress, tierForGrade } from '../src/domain/level';

describe('level = floor(XP / 100) + 1', () => {
  it.each([
    [0, 1],
    [10, 1],
    [99, 1],
    [100, 2],
    [199, 2],
    [250, 3],
    [1000, 11],
  ])('XP %i → level %i', (xp, level) => {
    expect(levelFromXp(xp)).toBe(level);
  });

  it('явц: тухайн level доторх XP', () => {
    expect(levelProgress(240)).toEqual({ level: 3, current: 40, needed: 100 });
    expect(levelProgress(0)).toEqual({ level: 1, current: 0, needed: 100 });
  });
});

describe('анги → түвшин', () => {
  it.each([
    [6, 1],
    [7, 1],
    [8, 2],
    [9, 2],
    [10, 3],
    [11, 3],
    [12, 3],
  ])('%i-р анги → түвшин %i', (grade, tier) => {
    expect(tierForGrade(grade)).toBe(tier);
  });

  it('6–12-оос гадуур бол null', () => {
    expect(tierForGrade(5)).toBeNull();
    expect(tierForGrade(13)).toBeNull();
  });
});
