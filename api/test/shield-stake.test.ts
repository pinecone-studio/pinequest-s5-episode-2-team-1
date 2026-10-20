import { describe, expect, it } from 'vitest';
import { shieldBlock, shieldNextBuyDay } from '../src/domain/shield';
import { maxStake, stakeError } from '../src/domain/stake';
import type { StreakState } from '../src/domain/streak';

const s = (p: Partial<StreakState>): StreakState => ({
  streak: 0,
  lastDay: null,
  shieldHeld: 0,
  shieldBoughtDay: null,
  shieldUsedDay: null,
  ...p,
});

describe('хамгаалалт худалдан авах нөхцөл', () => {
  it('50 оноотой, хамгаалалтгүй бол авч болно', () => {
    expect(shieldBlock(s({}), 50, '2026-10-20')).toBeNull();
  });

  it('гартаа байвал дахин авахгүй (нэгээс илүү хадгалахгүй)', () => {
    expect(shieldBlock(s({ shieldHeld: 1 }), 500, '2026-10-20')).toBe('SHIELD_HELD');
  });

  it('оноо хүрэлцэхгүй', () => {
    expect(shieldBlock(s({}), 49, '2026-10-20')).toBe('INSUFFICIENT_POINTS');
  });

  it('7 хоногт 1: 6 хоногийн дараа болохгүй, 7 хоногийн дараа болно', () => {
    const bought = s({ shieldBoughtDay: '2026-10-13' });
    expect(shieldBlock(bought, 100, '2026-10-19')).toBe('SHIELD_COOLDOWN');
    expect(shieldNextBuyDay(bought, '2026-10-19')).toBe('2026-10-20');
    expect(shieldBlock(bought, 100, '2026-10-20')).toBeNull();
    expect(shieldNextBuyDay(bought, '2026-10-20')).toBeNull();
  });

  it('зарцуулагдсан ч 7 хоног болоогүй бол дахин авахгүй', () => {
    expect(shieldBlock(s({ shieldHeld: 0, shieldBoughtDay: '2026-10-18' }), 100, '2026-10-20')).toBe('SHIELD_COOLDOWN');
  });
});

describe('бооцооны хязгаар (≤ 20%, ≥ 1)', () => {
  it.each([
    [50, 10],
    [54, 10],
    [55, 11],
    [5, 1],
    [4, 0],
    [0, 0],
  ])('%i оноо → дээд бооцоо %i', (points, max) => {
    expect(maxStake(points)).toBe(max);
  });

  it('хязгаар шалгах', () => {
    expect(stakeError(10, 50)).toBeNull();
    expect(stakeError(11, 50)).toBe('STAKE_TOO_HIGH');
    expect(stakeError(0, 50)).toBe('STAKE_TOO_LOW');
    expect(stakeError(2.5, 50)).toBe('STAKE_TOO_LOW');
    expect(stakeError(1, 4)).toBe('STAKE_TOO_HIGH');
  });
});
