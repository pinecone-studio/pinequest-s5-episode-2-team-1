import { describe, expect, it } from 'vitest';
import { topicIds } from '../src/config/topics';
import { validateDrafts } from '../src/llm/validate';
import { generate, shouldGenerateTemplates, type Level, templatesFor } from '../src/templates';
import { MATH6 } from '../src/templates/math6';
import { MATH7 } from '../src/templates/math7';
import { MATH6_MORE, MATH6_SPECS, MATH7_MORE, MATH7_SPECS } from '../src/templates/mathCurriculum';

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MATH6_PAGES = [
  5, 7, 10, 12, 14, 15, 17, 18, 20, 21, 23, 25, 30, 32, 36, 39, 40, 43, 46, 49, 51, 55, 57, 59, 61, 64, 70, 72, 74, 77, 83, 85, 87, 88, 90, 95, 97, 98, 101, 103, 104, 106, 108, 109, 111, 114, 116, 120, 121, 124, 126, 129, 130, 131, 133, 134, 138, 140, 142, 147, 148, 153, 156,
];
const MATH7_PAGES = [
  5, 7, 9, 11, 13, 14, 17, 18, 19, 22, 23, 25, 28, 32, 34, 37, 39, 41, 46, 50, 51, 59, 61, 63, 67, 69, 74, 76, 79, 83, 92, 94, 96, 98, 101, 104, 108, 120, 122, 123, 124, 126, 129, 132, 133, 135, 139, 141, 144, 147, 149, 151, 156, 157, 159, 161, 162, 164, 168, 173, 180,
];

describe('Математик 6, 7-ын бүх хичээлийн template coverage', () => {
  it('63 ба 61 хичээл бүр нэг template-тэй', () => {
    expect(MATH6.length + MATH6_MORE.length).toBe(63);
    expect(MATH7.length + MATH7_MORE.length).toBe(61);
    for (const [slug, pages] of [
      ['math-6', MATH6_PAGES],
      ['math-7', MATH7_PAGES],
    ] as const) {
      for (const [i, page] of pages.entries()) {
        const to = (pages[i + 1] ?? page + 20) - 1;
        expect(templatesFor({ slug, from: page, to }), `${slug}:${page}-${to}`).not.toHaveLength(0);
      }
    }
  });

  it('template id давхардахгүй, өөр ангийн ном руу холбогдохгүй', () => {
    const all = [...MATH6, ...MATH6_MORE, ...MATH7, ...MATH7_MORE];
    expect(new Set(all.map((template) => template.id)).size).toBe(all.length);
    expect([...MATH6, ...MATH6_MORE].every((template) => template.ref.startsWith('math-6:'))).toBe(true);
    expect([...MATH7, ...MATH7_MORE].every((template) => template.ref.startsWith('math-7:'))).toBe(true);
  });

  it('ерөнхий загвар хадгалсан 25 асуултыг орлохгүй, асуулт хүрэхгүй үед нөхнө', () => {
    expect(MATH6_MORE.every((template) => template.preferStored)).toBe(true);
    expect(MATH7_MORE.every((template) => template.preferStored)).toBe(true);
    expect(shouldGenerateTemplates([MATH7_MORE[0]], 25, 5)).toBe(false);
    expect(shouldGenerateTemplates([MATH7_MORE[0]], 4, 5)).toBe(true);
    expect(shouldGenerateTemplates([MATH7[0]], 25, 5)).toBe(true);
  });

  it('өмнө зөрсөн хичээлүүд өөрийн сэдвийн үүсгэгчтэй', () => {
    const kind6 = (page: number) => MATH6_SPECS.find((spec) => spec.page === page)?.kind;
    const kind7 = (page: number) => MATH7_SPECS.find((spec) => spec.page === page)?.kind;
    expect(kind6(97)).toBe('parallel-perp');
    expect(kind6(109)).toBe('diagonals');
    expect(kind6(109)).not.toBe(kind6(106));
    expect(kind6(131)).toBe('analog-digital');
    expect(kind7(92)).toBe('alternate');
    expect(kind7(108)).toBe('construct');
  });

  for (const template of [...MATH6_MORE, ...MATH7_MORE]) {
    it.each([1, 2, 3] as Level[])(`${template.id}, түвшин %i: 5 ялгаатай, хүчинтэй бодлого`, (level) => {
      const generated = generate([template], 5, level, seeded(template.id.length * 101 + level));
      expect(generated).toHaveLength(5);
      expect(new Set(generated.map((item) => item.draft.prompt)).size).toBe(5);
      expect(validateDrafts(generated.map((item) => item.draft), topicIds(1, 'math')).rejected).toEqual([]);
    });
  }
});
