import { describe, expect, it } from 'vitest';
import { bossBlock, bossesIn, bossWon, gateNode } from '../src/domain/boss';
import { currentNode } from '../src/domain/path';

describe('boss gate', () => {
  it('хаалга: 1-р boss, 2-р бүлгийн зүүн гар, баруун гар, boss, 3-р boss', () => {
    expect([0, 1, 2, 3, 4].map(gateNode)).toEqual([15, 29, 30, 31, 47]);
  });

  it.each([
    [16, 0, 0, null], // 16-р шат = 15-р зангилаа = 1-р boss
    [15, 0, 0, 'BOSS_LOCKED'], // хүрээгүй
    [40, 0, 0, null], // XP-ээр цааш ахисан ч ялаагүй boss хэвээр
    [40, 0, 1, 'BOSS_LOCKED'], // эхнийхийг алгасахгүй
    [40, 1, 0, 'BOSS_LOCKED'], // ялсан boss-той дахин биш
    [30, 1, 1, null], // 30-р шат = 29-р зангилаа = зүүн гар
    [30, 1, 2, 'BOSS_LOCKED'], // зүүн гарыг давж байж баруун гар
    [31, 2, 2, null],
    [31, 3, 3, 'BOSS_LOCKED'], // баруун гарыг давсан ч boss-ын зангилаанд хүрээгүй
    [32, 3, 3, null],
    [99, 5, 5, 'BOSS_LOCKED'], // бүх хаалга давсан
  ])('level %i, давсан %i, хаалга %i → %s', (level, beaten, gate, out) => {
    expect(bossBlock(level, beaten, gate)).toBe(out);
  });

  it('баавгай давж амжаагүй хаалганы дэргэд зогсоно', () => {
    expect([currentNode(40, 1), currentNode(40, 2), currentNode(40, 3), currentNode(40, 4)]).toEqual([29, 30, 31, 39]);
  });

  it('профайлд зөвхөн жинхэнэ boss тоологдоно', () => {
    expect([0, 1, 2, 3, 4, 5].map(bossesIn)).toEqual([0, 1, 1, 1, 2, 3]);
  });

  it('олонх зөв бол ялна', () => {
    expect([2, 3, 5].map(bossWon)).toEqual([false, true, true]);
  });
});
