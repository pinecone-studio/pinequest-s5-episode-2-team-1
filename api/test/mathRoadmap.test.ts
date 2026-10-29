import { describe, expect, it } from 'vitest';
import { MATH10_ROADMAP, MATH11_ROADMAP, MATH12_ROADMAP, MATH6_ROADMAP, MATH7_ROADMAP, MATH8_ROADMAP, MATH9_ROADMAP, mathRoadmapNodes } from '../src/config/mathRoadmap';
import { loadLessons } from '../src/services/lessons';
import { templateById } from '../src/templates';
import { MATH6 } from '../src/templates/math6';
import { MATH7 } from '../src/templates/math7';
import { MATH8, MATH9, MATH10 } from '../src/templates/mathAdvanced';
import { MATH6_MORE, MATH7_MORE } from '../src/templates/mathCurriculum';

describe('Математик 6–12-ын roadmap', () => {
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

  it.each([
    [8, MATH8_ROADMAP, [6, 3, 3, 7, 7, 7, 6, 5, 7], 51],
    [9, MATH9_ROADMAP, [4, 2, 1, 6, 4, 3, 4, 7, 4], 35],
    [10, MATH10_ROADMAP, [1, 5, 4, 4, 6, 5, 4, 3, 4, 6, 6, 5, 2, 2, 3], 60],
  ] as const)('%i-р анги номын бүлэг, хичээлийн бүтэцтэй', (grade, roadmap, chapterSizes, lessons) => {
    expect(roadmap.map((group) => group.nodes.length)).toEqual(chapterSizes);
    expect(mathRoadmapNodes(grade)).toHaveLength(lessons);
  });

  it.each([
    [11, MATH11_ROADMAP, [3, 2, 7, 3, 3, 3, 4, 9, 7, 3], 44, 'math-11:5-9', 'math-11:198-220'],
    [12, MATH12_ROADMAP, [3, 4, 7, 7, 5, 3, 8], 37, 'math-12:5', 'math-12:201-240'],
  ] as const)('%i-р анги номын албан ёсны бүтэц, DB book_ref-тэй', (grade, roadmap, chapterSizes, lessons, firstRef, lastRef) => {
    expect(roadmap.map((group) => group.nodes.length)).toEqual(chapterSizes);
    const nodes = mathRoadmapNodes(grade);
    expect(nodes).toHaveLength(lessons);
    expect(nodes[0].ref).toBe(firstRef);
    expect(nodes.at(-1)?.ref).toBe(lastRef);
    expect(nodes.every((node) => node.ref?.startsWith(`math-${grade}:`) && node.templateIds.length === 0)).toBe(true);
    expect(new Set(nodes.map((node) => node.ref)).size).toBe(lessons);
    const ranges = nodes.map((node) => {
      const match = /^math-\d+:(\d+)(?:-(\d+))?$/.exec(node.ref!);
      expect(match, node.ref).not.toBeNull();
      return [Number(match![1]), Number(match![2] ?? match![1])] as const;
    });
    for (let index = 1; index < ranges.length; index++) expect(ranges[index][0]).toBe(ranges[index - 1][1] + 1);
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
    [8, MATH8],
    [9, MATH9],
    [10, MATH10],
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
    const eight = await loadLessons({ BOOKS: noDb }, 'math', 8);
    const nine = await loadLessons({ BOOKS: noDb }, 'math', 9);
    const ten = await loadLessons({ BOOKS: noDb }, 'math', 10);
    const eleven = await loadLessons({ BOOKS: noDb }, 'math', 11);
    const twelve = await loadLessons({ BOOKS: noDb }, 'math', 12);
    expect(six.book).toBe('Математик 6');
    expect(seven.book).toBe('Математик 7');
    expect(eight.book).toBe('Математик 8');
    expect(nine.book).toBe('Математик 9');
    expect(ten.book).toBe('Математик 10');
    expect(eleven.book).toBe('Математик 11');
    expect(twelve.book).toBe('Математик 12');
    expect(six.lessons).toHaveLength(63);
    expect(seven.lessons).toHaveLength(61);
    expect(eight.lessons).toHaveLength(51);
    expect(nine.lessons).toHaveLength(35);
    expect(ten.lessons).toHaveLength(60);
    expect(eleven.lessons).toHaveLength(44);
    expect(twelve.lessons).toHaveLength(37);
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
    expect(eight.lessons[0].title).toBe('Рационал тоо');
    expect(eight.lessons[50].title).toBe('Хүснэгт, диаграммыг тайлбарлах');
    expect(nine.lessons[0].title).toBe('Иррационал тоо');
    expect(nine.lessons[34].title).toBe('Дунджууд ба далайц');
    expect(ten.lessons[0]).toEqual({
      chapter: 'I БҮЛЭГ. ОЛОНЛОГ',
      title: 'Олонлог',
      page: null,
    });
    expect(ten.lessons[1].title).toBe('Бүхэл тоон илтгэгчтэй зэрэг, түүний чанар');
    expect(ten.lessons[59].title).toBe('Пирамид, цилиндр, призм, бөмбөрцөг, конусын хавтгай огтлол');
    expect(eleven.lessons[0].title).toBe('Квадрат тэгшитгэл');
    expect(eleven.lessons[43].title).toBe('Хазайлт');
    expect(twelve.lessons[0].title).toBe('Тооны модул');
    expect(twelve.lessons[36].title).toBe('Комплекс тооны геометр дүрслэл');
  });
});
