import { describe, expect, it } from 'vitest';
import { bossBlock, bossesIn, bossWon } from '../src/domain/boss';
import { bossNode, currentNode, gateNodes, nodeCount } from '../src/domain/path';

describe('boss gate', () => {
  it('boss бүлгийн хичээлүүдийн дараа: замын урт хичээлийн тооноос', () => {
    expect([0, 1, 2].map((u) => bossNode(45, u))).toEqual([15, 31, 47]);
    expect([0, 1, 2].map((u) => bossNode(63, u))).toEqual([21, 43, 65]);
    expect([0, 1, 2].map((u) => bossNode(24, u))).toEqual([8, 17, 26]);
    expect([63, 24].map(nodeCount)).toEqual([66, 27]);
  });

  it('хаалга: 1-р boss, 2-р бүлгийн зүүн гар, баруун гар, boss, 3-р boss', () => {
    expect(gateNodes(45)).toEqual([15, 29, 30, 31, 47]);
    expect(gateNodes(63)).toEqual([21, 41, 42, 43, 65]);
  });

  it.each([
    [16, 0, 0, null], // 16-р шат = 15-р зангилаа = 1-р boss
    [15, 0, 0, 'BOSS_LOCKED'], // хүрээгүй
    [40, 0, 0, null], // цааш ахисан ч ялаагүй boss хэвээр
    [40, 0, 1, 'BOSS_LOCKED'], // эхнийхийг алгасахгүй
    [40, 1, 0, 'BOSS_LOCKED'], // ялсан boss-той дахин биш
    [30, 1, 1, null], // 30-р шат = 29-р зангилаа = зүүн гар
    [30, 1, 2, 'BOSS_LOCKED'], // зүүн гарыг давж байж баруун гар
    [31, 2, 2, null],
    [31, 3, 3, null], // баруун гарыг давбал баавгай boss-ын зангилаанд очно (давсан хаалганаас өмнө буцахгүй)
    [32, 3, 3, null],
    [99, 5, 5, 'BOSS_LOCKED'], // бүх хаалга давсан
  ])('level %i, давсан %i, хаалга %i → %s', (level, beaten, gate, out) => {
    expect(bossBlock(45, level, beaten, gate)).toBe(out);
  });

  it('баавгай давж амжаагүй хаалганы дэргэд зогсоно', () => {
    expect([1, 2, 3, 4].map((g) => currentNode(45, 40, g))).toEqual([29, 30, 31, 39]);
  });

  it('профайлд зөвхөн жинхэнэ boss тоологдоно', () => {
    expect([0, 1, 2, 3, 4, 5].map(bossesIn)).toEqual([0, 1, 1, 1, 2, 3]);
  });

  it('олонх зөв бол ялна', () => {
    expect([2, 3, 5].map(bossWon)).toEqual([false, true, true]);
  });
});
