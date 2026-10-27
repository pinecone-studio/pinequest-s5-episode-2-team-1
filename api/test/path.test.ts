import { describe, expect, it } from 'vitest';
import { ADVANCE_STAGE, stageDone } from '../../shared/path';
import { nodesAfter, taskPathLessons } from '../src/domain/path';

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
    expect(nodesAfter(63, 52, 4, 3, true)).toBe(53); // 3-р бүлгийн 1-р цэрэг
    expect(nodesAfter(63, 65, 6, 3, true)).toBe(65);
  });

  it('хаалгыг давбал дараагийн зангилаанд: зүүн гар → баруун гар → boss → 3-р бүлгийн цэргүүд → boss, сүүлийн boss-ын дараа төгсгөлд', () => {
    expect(nodesAfter(45, 15, 0, 3, true)).toBe(16);
    expect([1, 2, 3].map((g) => nodesAfter(45, 28 + g, g, 3, true))).toEqual([30, 31, 32]);
    // 3-р бүлэг: цэрэг (38) → ахлагч (43) → boss (47)
    expect([4, 5].map((g) => nodesAfter(45, 47, g, 3, true))).toEqual([39, 44]);
    expect(nodesAfter(45, 40, 4, 5, false)).toBe(38); // давж амжаагүй цэрэг рүү буцна
    expect(nodesAfter(45, 47, 6, 3, true)).toBe(47);
    expect(nodesAfter(45, 47, 7, 5, false)).toBe(47);
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

describe('migration 0020-оос өмнө эхэлсэн даалгавар (path_lessons = NULL)', () => {
  it('одоогийн номын замаар тооцно, номгүй бол 24 хичээлийн замаар', () => {
    expect(taskPathLessons(null, 63)).toBe(63);
    expect(taskPathLessons(null, 0)).toBe(24);
    expect(taskPathLessons(40, 63)).toBe(40); // хадгалсан урт түрүүлнэ
  });

  it('Математик 6-ын хүүхэд хуучин даалгавраа дуусгахад ухрахгүй (өмнө нь 30 → 15, 40 → 17, 12 → 8)', () => {
    for (const [nodes, gates, next] of [
      [30, 1, 31],
      [40, 3, 43], // 3 хаалга давсан: давсан хаалганы дараах зангилаа (43) хүртэл ахина
      [12, 0, 13],
    ]) {
      expect(nodesAfter(taskPathLessons(null, 63), nodes, gates, 5, false)).toBe(next);
    }
  });
});
