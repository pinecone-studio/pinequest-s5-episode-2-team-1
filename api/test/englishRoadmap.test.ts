import { describe, expect, it } from 'vitest';
import { roadmapNodes } from '../src/config/roadmap';
import { templateRange } from '../src/templates';

describe('Англи хэл 6–12-ын roadmap', () => {
  it.each([
    [6, 'english-6:8-11', 'english-6:115-117'],
    [7, 'english-7:10-14', 'english-7:146-149'],
    [8, 'english-8:10-14', 'english-8:147-150'],
    [9, 'english-9:8-11', 'english-9:149-153'],
    [10, 'english-10:8-13', 'english-10:164-167'],
    [11, 'english-11:9-14', 'english-11:164-166'],
    [12, 'english-12:9-15', 'english-12:184-188'],
  ] as const)('%i-р анги 10 unit × 3 зангилаатай', (grade, first, last) => {
    const nodes = roadmapNodes('english', grade);
    expect(nodes).toHaveLength(30);
    expect(nodes[0].ref).toBe(first);
    expect(nodes.at(-1)!.ref).toBe(last);
  });

  it('хичээл бүр өөрийн ангийн номын давхцаагүй, өсөх хуудасны хүрээтэй', () => {
    for (const grade of [6, 7, 8, 9, 10, 11, 12]) {
      let prev = 0;
      for (const node of roadmapNodes('english', grade)) {
        expect(node.templateIds).toEqual([]);
        const range = templateRange(node.ref!)!;
        expect(range.slug).toBe(`english-${grade}`);
        expect(range.from).toBeGreaterThan(prev);
        expect(range.to).toBeGreaterThanOrEqual(range.from);
        prev = range.to;
      }
    }
  });

  it('ном байхгүй анги roadmap-гүй', () => {
    expect(roadmapNodes('english', 5)).toEqual([]);
  });
});
