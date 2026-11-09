import { describe, expect, it } from 'vitest';
import { roadmapNodes } from '../src/config/roadmap';
import { templateRange } from '../src/templates';

describe('Хими 7–11-ийн roadmap', () => {
  it.each([
    [7, 16, 'chemistry-7:6-12', 'chemistry-7:88-93'],
    [8, 24, 'chemistry-8:6-11', 'chemistry-8:148-153'],
    [9, 29, 'chemistry-9:6-9', 'chemistry-9:175-179'],
    [10, 24, 'chemistry-10:6-10', 'chemistry-10:142-146'],
    [11, 22, 'chemistry-11:6-10', 'chemistry-11:140-146'],
  ] as const)('%i-р анги %i зангилаатай', (grade, count, first, last) => {
    const nodes = roadmapNodes('chemistry', grade);
    expect(nodes).toHaveLength(count);
    expect(nodes[0].ref).toBe(first);
    expect(nodes.at(-1)!.ref).toBe(last);
  });

  it('хичээл бүр өөрийн ангийн номын давхцаагүй, өсөх хуудасны хүрээтэй', () => {
    for (const grade of [7, 8, 9, 10, 11]) {
      let prev = 0;
      for (const node of roadmapNodes('chemistry', grade)) {
        expect(node.templateIds).toEqual([]);
        const range = templateRange(node.ref!)!;
        expect(range.slug).toBe(`chemistry-${grade}`);
        expect(range.from).toBeGreaterThan(prev);
        expect(range.to).toBeGreaterThanOrEqual(range.from);
        prev = range.to;
      }
    }
  });

  it('ном байхгүй анги roadmap-гүй', () => {
    expect(roadmapNodes('chemistry', 6)).toEqual([]);
  });
});
