import { describe, expect, it } from 'vitest';
import { ADVANCE_STAGE, stageDone } from '../../shared/path';
import { nodesAfter } from '../src/domain/path';

describe('сурах замын зангилаа даалгавраар ахина', () => {
  it('4/5 ба түүнээс олон зөв бол дараагийн зангилаа, цөөн бол хэвээр (XP-ийн үлдэгдэл тооцохгүй)', () => {
    expect([0, 3, 4, 5].map((c) => nodesAfter(45, 2, 0, c, false))).toEqual([2, 2, 3, 3]);
  });

  it('давж амжаагүй хаалганаас (boss, гар) цааш явахгүй', () => {
    expect(nodesAfter(45, 14, 0, 5, false)).toBe(15);
    expect(nodesAfter(45, 15, 0, 5, false)).toBe(15);
    expect(nodesAfter(45, 31, 1, 5, false)).toBe(29); // 2-р бүлгийн зүүн гар
  });

  it('63 хичээлтэй замд boss 21, 43, 65-р зангилаанд', () => {
    expect(nodesAfter(63, 20, 0, 4, false)).toBe(21);
    expect(nodesAfter(63, 21, 0, 5, false)).toBe(21);
    expect(nodesAfter(63, 21, 0, 3, true)).toBe(22);
    expect(nodesAfter(63, 65, 4, 3, true)).toBe(65);
  });

  it('хаалгыг давбал дараагийн зангилаанд: зүүн гар → баруун гар → boss → 3-р бүлэг, сүүлийн boss-ын дараа төгсгөлд', () => {
    expect(nodesAfter(45, 15, 0, 3, true)).toBe(16);
    expect([1, 2, 3].map((g) => nodesAfter(45, 28 + g, g, 3, true))).toEqual([30, 31, 32]);
    expect(nodesAfter(45, 47, 4, 3, true)).toBe(47);
    expect(nodesAfter(45, 47, 5, 5, false)).toBe(47);
  });
});

describe('зангилааны шат', () => {
  it('давсан шат: өмнөх зангилаа дор хаяж Дунд, одоогийнх тэмдэглэснээрээ', () => {
    expect(stageDone({}, 0, 3)).toBe(ADVANCE_STAGE);
    expect(stageDone({ 0: 3 }, 0, 3)).toBe(3);
    expect(stageDone({}, 3, 3)).toBe(0);
    expect(stageDone({ 3: 1 }, 3, 3)).toBe(1);
  });
});
