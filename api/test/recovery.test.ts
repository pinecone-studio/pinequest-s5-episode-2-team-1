import { describe, expect, it } from 'vitest';
import { groupByTopic, practiceIds, recoveryCertain } from '../src/services/recovery';

describe('салаа замын асуулт сонголт', () => {
  it('алдсан асуултыг сэдвээр бүлэглэж, сэдэвгүйг тус тусад нь үлдээнэ', () => {
    const groups = groupByTopic([
      { id: 1, topic: 'percent' },
      { id: 2, topic: null },
      { id: 3, topic: 'percent' },
      { id: 4, topic: null },
    ]);
    expect(groups.map((g) => g.map((q) => q.id))).toEqual([[1, 3], [2], [4]]);
  });

  it('сэдэв бүрт 3 хүртэл өөр асуулт, дутууг алдсан асуултаар нөхнө', () => {
    expect(
      practiceIds([
        { missed: [1, 3], picked: [10, 11, 12, 13] },
        { missed: [2], picked: [20] },
        { missed: [4, 5], picked: [] },
        { missed: [6, 7, 8, 9], picked: [] },
      ]),
    ).toEqual([10, 11, 12, 20, 2, 4, 5, 6, 7, 8]);
  });

  it('2 буюу түүнээс олон алдаа гарвал салаа зам заавал нээгдэнэ (зөв хариуг тэр үед л нууна)', () => {
    expect([0, 1, 2, 3].map(recoveryCertain)).toEqual([false, false, true, true]);
  });
});
