import { describe, expect, it } from 'vitest';
import { MATH6_ROADMAP, MATH7_ROADMAP, mathRoadmapNodes } from '../src/config/mathRoadmap';
import { loadLessons } from '../src/services/lessons';
import { templateById } from '../src/templates';
import { MATH6 } from '../src/templates/math6';
import { MATH7 } from '../src/templates/math7';
import { MATH6_MORE, MATH7_MORE } from '../src/templates/mathCurriculum';

describe('Математик 6, 7-ын roadmap', () => {
  it('6-р анги номын 12 бүлэг, 63 хичээлийн бүтэцтэй', () => {
    expect(MATH6_ROADMAP.map((chapter) => chapter.nodes.length)).toEqual([10, 11, 3, 2, 4, 5, 12, 4, 3, 5, 2, 2]);
    expect(mathRoadmapNodes(6)).toHaveLength(63);
    expect(MATH6_ROADMAP.map((chapter) => chapter.title)).toEqual([
      'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР',
      'II БҮЛЭГ. АРАВТЫН БА ЭНГИЙН БУТАРХАЙ, ПРОЦЕНТ',
      'III БҮЛЭГ. ХАРЬЦАА, ПРОПОРЦ',
      'IV БҮЛЭГ. МАГАДЛАЛ',
      'V БҮЛЭГ. АЛГЕБРЫН ИЛЭРХИЙЛЭЛ, ТЭГШИТГЭЛ',
      'VI БҮЛЭГ. ДАРААЛАЛ, ФУНКЦ',
      'VII БҮЛЭГ. ДҮРС, ӨНЦӨГ, БИЕТ',
      'VIII БҮЛЭГ. БАЙРШИЛ, ХӨДӨЛГӨӨН',
      'IX БҮЛЭГ. ХЭМЖИХ НЭГЖ',
      'X БҮЛЭГ. ТАЛБАЙ, ЭЗЛЭХҮҮН',
      'XI БҮЛЭГ. ӨГӨГДӨЛ ЦУГЛУУЛАХ, ДҮРСЛЭХ',
      'XII БҮЛЭГ. ДУНДЖУУД БА ДАЛАЙЦ',
    ]);
  });

  it('7-р анги номын 10 бүлэг, 61 хичээлийн бүтэцтэй', () => {
    expect(MATH7_ROADMAP.map((chapter) => chapter.nodes.length)).toEqual([6, 12, 2, 1, 5, 4, 7, 5, 10, 9]);
    expect(mathRoadmapNodes(7)).toHaveLength(61);
    expect(MATH7_ROADMAP.map((chapter) => chapter.title)).toEqual([
      'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР',
      'II БҮЛЭГ. АРАВТЫН БА ЭНГИЙН БУТАРХАЙ, ПРОЦЕНТ',
      'III БҮЛЭГ. ХАРЬЦАА, ПРОПОРЦ',
      'IV БҮЛЭГ. МАГАДЛАЛ',
      'V БҮЛЭГ. АЛГЕБРЫН ИЛЭРХИЙЛЭЛ, ТЭГШИТГЭЛ',
      'VI БҮЛЭГ. ДАРААЛАЛ, ФУНКЦ',
      'VII БҮЛЭГ. ӨНЦӨГ, ДҮРС, БАЙГУУЛАЛТ',
      'VIII БҮЛЭГ. БАЙРШИЛ, ХӨДӨЛГӨӨН',
      'IX БҮЛЭГ. ТАЛБАЙ, ЭЗЛЭХҮҮН',
      'X БҮЛЭГ. ӨГӨГДӨЛТЭЙ АЖИЛЛАХ',
    ]);
  });

  it.each([
    [6, [...MATH6, ...MATH6_MORE]],
    [7, [...MATH7, ...MATH7_MORE]],
  ] as const)('%i-р ангийн одоо байгаа бүх template roadmap-д орсон', (grade, templates) => {
    const nodes = mathRoadmapNodes(grade);
    const mappedIds = nodes.flatMap((node) => node.templateIds);
    const ids = new Set(nodes.flatMap((node) => node.templateIds));
    expect(templates.every((template) => ids.has(template.id))).toBe(true);
    expect(mappedIds).toHaveLength(templates.length);
    expect(ids.size).toBe(templates.length);
    for (const id of ids) {
      const template = templateById(id);
      expect(template, id).toBeDefined();
      expect(template?.ref.startsWith(`math-${grade}:`), id).toBe(true);
    }
  });

  it('номын local DB хоосон байсан ч API static roadmap-ийг буцаана', async () => {
    const noDb = {
      prepare() {
        throw new Error('BOOKS DB дуудах ёсгүй');
      },
    } as unknown as D1Database;
    const six = await loadLessons({ BOOKS: noDb }, 'math', 6);
    const seven = await loadLessons({ BOOKS: noDb }, 'math', 7);
    expect(six.book).toBe('Математик 6');
    expect(seven.book).toBe('Математик 7');
    expect(six.lessons).toHaveLength(63);
    expect(seven.lessons).toHaveLength(61);
    expect(six.lessons[0]).toEqual({
      chapter: 'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР',
      title: 'Бүхэл тоонуудыг жиших',
      page: null,
    });
    expect(six.lessons[59].title).toBe('Өгөгдөл цуглуулах, бүртгэх');
    expect(six.lessons[62].title).toBe('Хүснэгт, диаграмм, графикийг унших, тайлбарлах');
    expect(seven.lessons[0].title).toBe('Тооны модул');
    expect(seven.lessons[52].chapter).toBe('X БҮЛЭГ. ӨГӨГДӨЛТЭЙ АЖИЛЛАХ');
    expect(seven.lessons[60].title).toBe('Туршилт, харьцангуй давтамж');
  });
});
