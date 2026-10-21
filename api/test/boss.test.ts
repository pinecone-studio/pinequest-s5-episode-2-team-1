import { describe, expect, it } from 'vitest';
import { bossBlock, bossNode, bossWon } from '../src/domain/boss';

describe('boss gate', () => {
  it('boss бүлгийн сүүлийн зангилаанд', () => {
    expect([0, 1, 2].map(bossNode)).toEqual([15, 31, 47]);
  });

  it.each([
    [16, 0, 0, null], // 16-р шат = 15-р зангилаа = 1-р boss
    [15, 0, 0, 'BOSS_LOCKED'], // хүрээгүй
    [40, 0, 0, null], // XP-ээр цааш ахисан ч ялаагүй boss хэвээр
    [40, 0, 1, 'BOSS_LOCKED'], // эхнийхийг алгасахгүй
    [40, 1, 0, 'BOSS_LOCKED'], // ялсан boss-той дахин биш
    [32, 1, 1, null],
    [99, 3, 3, 'BOSS_LOCKED'], // boss дууссан
  ])('level %i, ялсан %i, boss %i → %s', (level, beaten, unit, out) => {
    expect(bossBlock(level, beaten, unit)).toBe(out);
  });

  it('олонх зөв бол ялна', () => {
    expect([2, 3, 5].map(bossWon)).toEqual([false, true, true]);
  });
});
