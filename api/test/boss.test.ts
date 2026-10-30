import { describe, expect, it } from 'vitest';
import { bossBlock, bossesIn, bossWon } from '../src/domain/boss';
import { bossNode, currentNode, gateNodes, nodeCount } from '../src/domain/path';
import { chestNodes, GATE_STAGE } from '../../shared/path';

describe('boss gate', () => {
  it('boss бүлгийн хичээлүүдийн дараа: замын урт хичээлийн тооноос', () => {
    expect([0, 1, 2, 3].map((u) => bossNode(45, u))).toEqual([11, 23, 35, 48]);
    expect([0, 1, 2, 3].map((u) => bossNode(63, u))).toEqual([15, 32, 49, 66]);
    expect([0, 1, 2, 3].map((u) => bossNode(24, u))).toEqual([6, 13, 20, 27]);
    expect([63, 24].map(nodeCount)).toEqual([67, 28]);
  });

  it('хаалга: 1-р boss; 2-р бүлгийн зүүн, баруун гар, boss; 3-р бүлгийн 2 цэрэг, boss; 4-р бүлгийн зүүн, баруун гар, туслах, boss', () => {
    expect(gateNodes(45)).toEqual([11, 21, 22, 23, 28, 32, 35, 45, 46, 47, 48]);
    expect(gateNodes(63)).toEqual([15, 30, 31, 32, 39, 45, 49, 63, 64, 65, 66]);
    expect(gateNodes(24)).toEqual([6, 11, 12, 13, 16, 19, 20, 24, 25, 26, 27]);
    expect(GATE_STAGE).toHaveLength(gateNodes(24).length);
  });

  it('нууц хайрцаг цэрэг бүрийн өмнөх хичээлд; хаалгатай давхцахгүй', () => {
    expect(chestNodes(24)).toEqual([15, 18]);
    expect(chestNodes(45)).toEqual([27, 31]);
    // хамгийн богино зам (бүлэгт 3 хичээл): цэргүүд зэрэгцэж, нэг л хайрцаг
    expect(gateNodes(12).slice(4, 7)).toEqual([9, 10, 11]);
    expect(chestNodes(12)).toEqual([8]);
    for (const n of [12, 13, 24, 30, 45, 63, 100]) {
      const gates = gateNodes(n);
      for (const c of chestNodes(n)) expect(gates).not.toContain(c);
      // хаалга бүр өмнөхөөсөө хойно, бүлэг бүрийн boss нь тэр бүлгийн хичээлүүдийн дараа
      for (let k = 1; k < gates.length; k++) expect(gates[k]).toBeGreaterThan(gates[k - 1]);
      expect([0, 1, 2, 3].map((u) => bossNode(n, u))).toEqual([gates[0], gates[3], gates[6], gates[10]]);
    }
  });

  it.each([
    [12, 0, 0, null], // 12-р шат = 11-р зангилаа = 1-р boss
    [11, 0, 0, 'BOSS_LOCKED'], // хүрээгүй
    [40, 0, 0, null], // цааш ахисан ч ялаагүй boss хэвээр
    [40, 0, 1, 'BOSS_LOCKED'], // эхнийхийг алгасахгүй
    [40, 1, 0, 'BOSS_LOCKED'], // ялсан boss-той дахин биш
    [22, 1, 1, null], // 22-р шат = 21-р зангилаа = зүүн гар
    [22, 1, 2, 'BOSS_LOCKED'], // зүүн гарыг давж байж баруун гар
    [23, 2, 2, null],
    [23, 3, 3, null], // баруун гарыг давбал баавгай boss-ын зангилаанд очно (давсан хаалганаас өмнө буцахгүй)
    [99, 5, 5, null], // 3-р бүлгийн 2-р цэрэг
    [99, 7, 7, null], // 4-р бүлгийн зүүн гар
    [99, 10, 10, null], // Santa
    [99, 11, 11, 'BOSS_LOCKED'], // бүх хаалга давсан
  ])('level %i, давсан %i, хаалга %i → %s', (level, beaten, gate, out) => {
    expect(bossBlock(45, level, beaten, gate)).toBe(out);
  });

  it('баавгай давж амжаагүй хаалганы дэргэд зогсоно', () => {
    expect([1, 2, 3, 4, 5].map((g) => currentNode(45, 40, g))).toEqual([21, 22, 23, 28, 32]);
  });

  it('профайлд зөвхөн жинхэнэ boss тоологдоно', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(bossesIn)).toEqual([0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4]);
  });

  it('бүх асуултад зөв хариулбал л ялна', () => {
    expect([3, 4].map((c) => bossWon(c, 5 - c))).toEqual([false, false]);
    expect(bossWon(5, 0)).toBe(true);
  });

  it('мэдээлсэн (flag) асуулт алдаа биш, бүгдийг нь мэдээлбэл ялахгүй', () => {
    expect(bossWon(4, 0)).toBe(true);
    expect(bossWon(4, 1)).toBe(false);
    expect(bossWon(0, 0)).toBe(false);
  });
});
