import { describe, expect, it } from 'vitest';
import { nodesAfter } from '../src/domain/path';

describe('сурах замын зангилаа даалгавраар ахина', () => {
  it('4/5 ба түүнээс олон зөв бол дараагийн зангилаа, цөөн бол хэвээр (XP-ийн үлдэгдэл тооцохгүй)', () => {
    expect([0, 3, 4, 5].map((c) => nodesAfter(2, 0, c, false))).toEqual([2, 2, 3, 3]);
  });

  it('давж амжаагүй хаалганаас (boss, гар) цааш явахгүй', () => {
    expect(nodesAfter(14, 0, 5, false)).toBe(15);
    expect(nodesAfter(15, 0, 5, false)).toBe(15);
    expect(nodesAfter(31, 1, 5, false)).toBe(29); // 2-р бүлгийн зүүн гар
  });

  it('хаалгыг давбал дараагийн зангилаанд: зүүн гар → баруун гар → boss → 3-р бүлэг, сүүлийн boss-ын дараа төгсгөлд', () => {
    expect(nodesAfter(15, 0, 3, true)).toBe(16);
    expect([1, 2, 3].map((g) => nodesAfter(28 + g, g, 3, true))).toEqual([30, 31, 32]);
    expect(nodesAfter(47, 4, 3, true)).toBe(47);
    expect(nodesAfter(47, 5, 5, false)).toBe(47);
  });
});
