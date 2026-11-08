import { describe, expect, it } from 'vitest';
import { roadmapNodes } from '../src/config/roadmap';
import { templateRange } from '../src/templates';

describe('Физик 7–11-ийн roadmap', () => {
  it.each([
    [7, 26, 'physics-7:6-13', 'physics-7:135-140'],
    [8, 25, 'physics-8:6-12', 'physics-8:151-155'],
    [9, 30, 'physics-9:7-12', 'physics-9:177-184'],
    [10, 26, 'physics-10:6-12', 'physics-10:146-148'],
    [11, 23, 'physics-11:6-10', 'physics-11:142-148'],
  ] as const)('%i-р анги %i зангилаатай', (grade, count, first, last) => {
    const nodes = roadmapNodes('physics', grade);
    expect(nodes).toHaveLength(count);
    expect(nodes[0].ref).toBe(first);
    expect(nodes.at(-1)!.ref).toBe(last);
  });

  it('хичээл бүр өөрийн ангийн номын давхцаагүй, өсөх хуудасны хүрээтэй', () => {
    for (const grade of [7, 8, 9, 10, 11]) {
      let prev = 0;
      for (const node of roadmapNodes('physics', grade)) {
        expect(node.templateIds).toEqual([]);
        const range = templateRange(node.ref!)!;
        expect(range.slug).toBe(`physics-${grade}`);
        expect(range.from).toBeGreaterThan(prev);
        expect(range.to).toBeGreaterThanOrEqual(range.from);
        prev = range.to;
      }
    }
  });

  it('ном байхгүй анги roadmap-гүй', () => {
    expect(roadmapNodes('physics', 6)).toEqual([]);
  });
});
