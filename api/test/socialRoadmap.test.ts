import { describe, expect, it } from 'vitest';
import { roadmapNodes } from '../src/config/roadmap';
import { SOCIAL10_ROADMAP, SOCIAL11_ROADMAP, SOCIAL7_ROADMAP, SOCIAL8_ROADMAP, SOCIAL9_ROADMAP } from '../src/config/socialRoadmap';
import { templateRange } from '../src/templates';

describe('Нийгэм судлал 7–11-ийн roadmap', () => {
  it.each([
    [7, SOCIAL7_ROADMAP, [4, 3, 5, 4, 3], 19, 'social-7:7-9', 'social-7:90-92'],
    [8, SOCIAL8_ROADMAP, [3, 3, 3, 5, 3], 17, 'social-8:6-11', 'social-8:90-93'],
    [9, SOCIAL9_ROADMAP, [4, 4, 5, 5, 4], 22, 'social-9:6-8', 'social-9:90-91'],
    [10, SOCIAL10_ROADMAP, [4, 5, 6, 3, 4, 7], 29, 'social-10:5-9', 'social-10:137-139'],
    [11, SOCIAL11_ROADMAP, [2, 4, 5, 5, 4, 4], 24, 'social-11:6-28', 'social-11:186-190'],
  ] as const)('%i-р анги номын бүлэг, хичээлийн бүтэцтэй', (grade, roadmap, chapterSizes, lessons, first, last) => {
    expect(roadmap.map((group) => group.nodes.length)).toEqual(chapterSizes);
    const nodes = roadmapNodes('social', grade);
    expect(nodes).toHaveLength(lessons);
    expect(nodes[0].ref).toBe(first);
    expect(nodes.at(-1)!.ref).toBe(last);
  });

  it('хичээл бүр өөрийн ангийн номын давхцаагүй, өсөх хуудасны хүрээтэй', () => {
    for (const grade of [7, 8, 9, 10, 11]) {
      let prev = 0;
      for (const node of roadmapNodes('social', grade)) {
        expect(node.templateIds).toEqual([]);
        const range = templateRange(node.ref!)!;
        expect(range.slug).toBe(`social-${grade}`);
        expect(range.from).toBeGreaterThan(prev);
        expect(range.to).toBeGreaterThanOrEqual(range.from);
        prev = range.to;
      }
    }
  });

  it('ном байхгүй анги, бусад хичээл roadmap-гүй', () => {
    expect(roadmapNodes('social', 6)).toEqual([]);
    expect(roadmapNodes('social', 12)).toEqual([]);
    expect(roadmapNodes('mongolian', 9)).toEqual([]);
    expect(roadmapNodes('math', 6).length).toBeGreaterThan(0);
  });
});
