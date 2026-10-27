import { describe, expect, it } from 'vitest';
import { bossBlock, bossesIn, bossWon } from '../src/domain/boss';
import { bossNode, currentNode, gateNodes, nodeCount } from '../src/domain/path';
import { chestNodes, GATE_STAGE } from '../../shared/path';

describe('boss gate', () => {
  it('boss бүлгийн хичээлүүдийн дараа: замын урт хичээлийн тооноос', () => {
    expect([0, 1, 2].map((u) => bossNode(45, u))).toEqual([15, 31, 47]);
    expect([0, 1, 2].map((u) => bossNode(63, u))).toEqual([21, 43, 65]);
    expect([0, 1, 2].map((u) => bossNode(24, u))).toEqual([8, 17, 26]);
    expect([63, 24].map(nodeCount)).toEqual([66, 27]);
  });

  it('хаалга: 1-р boss, 2-р бүлгийн зүүн гар, баруун гар, boss, 3-р бүлгийн 2 цэрэг, boss', () => {
    expect(gateNodes(45)).toEqual([15, 29, 30, 31, 38, 43, 47]);
    expect(gateNodes(63)).toEqual([21, 41, 42, 43, 52, 60, 65]);
    expect(gateNodes(24)).toEqual([8, 15, 16, 17, 21, 24, 26]);
    expect(GATE_STAGE).toHaveLength(gateNodes(24).length);
  });

  it('нууц хайрцаг цэрэг бүрийн өмнөх хичээлд; хаалгатай давхцахгүй', () => {
    expect(chestNodes(24)).toEqual([20, 23]);
    expect(chestNodes(45)).toEqual([37, 42]);
    // хамгийн богино зам (бүлэгт 3 хичээл): цэргүүд зэрэгцэж, нэг л хайрцаг
    expect(gateNodes(9).slice(4)).toEqual([9, 10, 11]);
    expect(chestNodes(9)).toEqual([8]);
    for (const n of [9, 10, 24, 30, 45, 63, 100]) for (const c of chestNodes(n)) expect(gateNodes(n)).not.toContain(c);
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
    [99, 5, 5, null], // 3-р бүлгийн 2-р цэрэг
    [99, 7, 7, 'BOSS_LOCKED'], // бүх хаалга давсан
  ])('level %i, давсан %i, хаалга %i → %s', (level, beaten, gate, out) => {
    expect(bossBlock(45, level, beaten, gate)).toBe(out);
  });

  it('баавгай давж амжаагүй хаалганы дэргэд зогсоно', () => {
    expect([1, 2, 3, 4, 5].map((g) => currentNode(45, 40, g))).toEqual([29, 30, 31, 38, 39]);
  });

  it('профайлд зөвхөн жинхэнэ boss тоологдоно', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(bossesIn)).toEqual([0, 1, 1, 1, 2, 2, 2, 3]);
  });

  it('олонх зөв бол ялна', () => {
    expect([2, 3, 5].map(bossWon)).toEqual([false, true, true]);
  });
});
