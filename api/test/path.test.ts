import { describe, expect, it } from 'vitest';
import { ADVANCE_STAGE, stageDone } from '../../shared/path';
import { nodesAfter, taskPathLessons } from '../src/domain/path';

describe('сурах замын зангилаа даалгавраар ахина', () => {
  it('4/5 ба түүнээс олон зөв бол дараагийн зангилаа, цөөн бол хэвээр (XP-ийн үлдэгдэл тооцохгүй)', () => {
    expect([0, 3, 4, 5].map((c) => nodesAfter(45, 2, 0, c, false))).toEqual([2, 2, 3, 3]);
  });

  it('давж амжаагүй хаалганаас (boss, гар) цааш явахгүй', () => {
    expect(nodesAfter(45, 10, 0, 5, false)).toBe(11);
    expect(nodesAfter(45, 11, 0, 5, false)).toBe(11);
    expect(nodesAfter(45, 23, 1, 5, false)).toBe(21); // 2-р бүлгийн зүүн гар
  });

  it('63 хичээлтэй замд boss 15, 32, 49, 66-р зангилаанд', () => {
    expect(nodesAfter(63, 14, 0, 4, false)).toBe(15);
    expect(nodesAfter(63, 15, 0, 5, false)).toBe(15);
    expect(nodesAfter(63, 15, 0, 3, true)).toBe(16);
    expect(nodesAfter(63, 39, 4, 3, true)).toBe(40); // 3-р бүлгийн 1-р цэрэг
    expect(nodesAfter(63, 66, 10, 3, true)).toBe(66);
  });

  it('хаалгыг давбал дараагийн зангилаанд: гарууд → boss → цэргүүд → boss → 4-р бүлгийн гарууд, туслах → Santa, сүүлийнхийн дараа төгсгөлд', () => {
    expect(nodesAfter(45, 11, 0, 3, true)).toBe(12);
    expect([1, 2, 3].map((g) => nodesAfter(45, 20 + g, g, 3, true))).toEqual([22, 23, 24]);
    // 3-р бүлэг: цэрэг (28) → ахлагч (32) → boss (35)
    expect([4, 5, 6].map((g) => nodesAfter(45, 48, g, 3, true))).toEqual([29, 33, 36]);
    expect(nodesAfter(45, 30, 4, 5, false)).toBe(28); // давж амжаагүй цэрэг рүү буцна
    // 4-р бүлэг: зүүн гар (45) → баруун гар (46) → туслах (47) → Santa (48)
    expect([7, 8, 9].map((g) => nodesAfter(45, 48, g, 3, true))).toEqual([46, 47, 48]);
    expect(nodesAfter(45, 48, 10, 3, true)).toBe(48);
    expect(nodesAfter(45, 48, 11, 5, false)).toBe(48);
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
      [30, 1, 30], // 2-р бүлгийн зүүн гар (30) дээр зогсоно
      [35, 4, 36], // 4 хаалга давсан: дараагийн хаалга (39) хүртэл ахина
      [12, 0, 13],
    ]) {
      expect(nodesAfter(taskPathLessons(null, 63), nodes, gates, 5, false)).toBe(next);
    }
  });
});
