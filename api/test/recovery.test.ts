import { describe, expect, it } from 'vitest';
import { groupByLesson, mainGroup, practiceIds, recoveryCertain } from '../src/services/recovery';

describe('салаа замын асуулт сонголт', () => {
  it('алдсан асуултыг сэдвээр бүлэглэж, сэдэвгүйг тус тусад нь үлдээнэ', () => {
    const groups = groupByLesson([
      { id: 1, topic: 'percent', book_ref: null },
      { id: 2, topic: null, book_ref: null },
      { id: 3, topic: 'percent', book_ref: null },
      { id: 4, topic: null, book_ref: null },
    ]);
    expect(groups.map((g) => g.map((q) => q.id))).toEqual([[1, 3], [2], [4]]);
  });

  it('сурах бичгийн асуултыг сэдвээр биш хичээлийн хуудсаар (book_ref) бүлэглэнэ', () => {
    const groups = groupByLesson([
      { id: 1, topic: 'divisibility', book_ref: 'math-6:14' },
      { id: 2, topic: 'divisibility', book_ref: 'math-6:17' },
      { id: 3, topic: 'divisibility', book_ref: 'math-6:14' },
      { id: 4, topic: 'divisibility', book_ref: null },
    ]);
    expect(groups.map((g) => g.map((q) => q.id))).toEqual([[1, 3], [2], [4]]);
  });

  it('алдааны тооноос үл хамааран нийт 3 асуулт: өөр асуулт, дутууг алдсан асуултаар', () => {
    expect(practiceIds([10, 11, 12, 13], [1, 2, 3, 4, 5])).toEqual([10, 11, 12]);
    expect(practiceIds([10], [1, 2, 3])).toEqual([10, 1, 2]);
    expect(practiceIds([], [1, 2])).toEqual([1, 2]);
  });

  it('номгүй үед хамгийн олон алдсан нэг сэдвийг давтана (тэнцвэл эхэлж алдсан нь)', () => {
    const q = (id: number, topic: string) => ({ id, topic, book_ref: null });
    expect(mainGroup([q(1, 'cases'), q(2, 'plural'), q(3, 'plural')]).map((x) => x.id)).toEqual([2, 3]);
    expect(mainGroup([q(1, 'cases'), q(2, 'plural')]).map((x) => x.id)).toEqual([1]);
  });

  it('2 буюу түүнээс олон алдаа гарвал салаа зам заавал нээгдэнэ (зөв хариуг тэр үед л нууна)', () => {
    expect([0, 1, 2, 3].map(recoveryCertain)).toEqual([false, false, true, true]);
  });
});
