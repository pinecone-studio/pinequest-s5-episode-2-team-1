import { describe, expect, it } from 'vitest';
import { bookOfRef } from '../src/routes/admin';
import type { BookLesson } from '../../shared/types';
import { currentNode, lessonsAt } from '../src/domain/path';
import { type BookLessons, lessonPages, parseToc } from '../src/services/lessons';

// Сан дахь Математик 6, 8-ын гарчгийн хуудсаас товчилсон
const inline = [
  '1\nМАТЕМАТИК 6',
  [
    '3',
    'ГАРЧИГ',
    'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР',
    'Бүхэл тоонуудыг жиших ........................... 5',
    '4, 6 ба 8-д хуваагдах тооны шинж ................ 12',
    'II БҮЛЭГ. ПРОЦЕНТ ...............................',
    'Өөрийгөө сориорой ............................... 29',
    'Процент ......................................... 51',
    'ХАРИУ ........................................... 163',
  ].join('\n'),
];

const column = [
  [
    '3',
    'АГУУЛГА',
    '5',
    '6',
    '6',
    '8',
    'Сурах бичгийг хэрхэн ашиглах вэ?......................',
    'I БҮЛЭГ. ТООН ОЛОНЛОГ, ЗЭРЭГ ЯЗГУУР',
    'Рационал тоо ..........................................',
    'Тоог тоймлох ..........................................',
    'МАТЕМАТИК VIII',
  ].join('\n'),
  ['4', 'МАТЕМАТИК VIII', 'Давтах .........................', 'Хувь ...........................', '20', '21'].join('\n'),
  ['5', 'I БҮЛЭГ. ТООН ОЛОНЛОГ, ЗЭРЭГ ЯЗГУУР', 'Рационал тоо', 'Жишээ 1.'].join('\n'),
];

describe('parseToc', () => {
  it('мөрийн төгсгөлийн хуудасны дугаартай гарчиг; сорил, хариу орохгүй', () => {
    expect(parseToc(inline)).toEqual([
      { chapter: 'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР', title: 'Бүхэл тоонуудыг жиших', page: 5 },
      { chapter: 'I БҮЛЭГ. БҮХЭЛ ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР', title: '4, 6 ба 8-д хуваагдах тооны шинж', page: 12 },
      { chapter: 'II БҮЛЭГ. ПРОЦЕНТ', title: 'Процент', page: 51 },
    ]);
  });

  it('дугаар нь тусдаа баганаар, хэд хэдэн хуудсанд үргэлжилсэн гарчиг; оршил орохгүй', () => {
    const chapter = 'I БҮЛЭГ. ТООН ОЛОНЛОГ, ЗЭРЭГ ЯЗГУУР';
    expect(parseToc(column)).toEqual([
      { chapter, title: 'Рационал тоо', page: 6 },
      { chapter, title: 'Тоог тоймлох', page: 8 },
      { chapter, title: 'Хувь', page: 21 },
    ]);
  });

  it('гарчиггүй ном', () => {
    expect(parseToc(['1\nНүүр', '2\nЖишээ'])).toEqual([]);
  });
});

describe('currentNode', () => {
  it('шат − 1, ялаагүй boss-ын дэргэд зогсоно', () => {
    expect(currentNode(1, 0)).toBe(0);
    expect(currentNode(5, 0)).toBe(4);
    expect(currentNode(40, 0)).toBe(15);
    expect(currentNode(40, 1)).toBe(31);
    expect(currentNode(100, 3)).toBe(47);
  });
});

describe('lessonsAt', () => {
  const lessons = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('boss-гүй 45 зангилаанд дарааллаар жигд; boss зангилаанд хичээл байхгүй', () => {
    expect(lessonsAt(lessons(45), 0)).toEqual([0]);
    expect(lessonsAt(lessons(45), 14)).toEqual([14]);
    expect(lessonsAt(lessons(45), 15)).toEqual([]);
    expect(lessonsAt(lessons(45), 16)).toEqual([15]);
    expect(lessonsAt(lessons(45), 46)).toEqual([44]);
  });

  it('хичээл олон бол нэг зангилаанд хоёр, цөөн бол нэг хичээл хэд хэдэн зангилаанд', () => {
    expect(lessonsAt(lessons(90), 0)).toEqual([0, 1]);
    expect(lessonsAt(lessons(9), 0)).toEqual([0]);
    expect(lessonsAt(lessons(9), 4)).toEqual([0]);
    expect(lessonsAt(lessons(9), 5)).toEqual([1]);
    expect(lessonsAt([], 0)).toEqual([]);
  });
});

describe('lessonPages', () => {
  // 45 хичээл: зангилаа бүрт нэг. Хичээл k нь 5 + 2k хуудаснаас эхэлнэ ('Тооны модул' 5–6, дараагийнх 7-оос).
  const book = (pages: (number | null)[], offset = 0): BookLessons => ({
    slug: 'math-7',
    title: 'Математик 7',
    offset,
    lastPage: 120,
    lessons: pages.map((page, i): BookLesson => ({ chapter: 'I БҮЛЭГ', title: `Хичээл ${i}`, page })),
  });
  const pages = Array.from({ length: 45 }, (_, k): number | null => 5 + 2 * k);

  it('хичээлийн хуудаснаас дараагийн хичээлийн өмнөх хуудас хүртэл', () => {
    expect(lessonPages(book(pages), 0)).toEqual({ slug: 'math-7', from: 5, to: 6 });
    expect(lessonPages(book(pages), 16)).toEqual({ slug: 'math-7', from: 35, to: 36 });
  });

  it('сүүлийн хичээл номын төгсгөл хүртэл; сан дахь хуудас = хэвлэмэл + offset', () => {
    expect(lessonPages(book(pages), 46)).toEqual({ slug: 'math-7', from: 93, to: 120 });
    expect(lessonPages(book(pages, 2), 0)).toEqual({ slug: 'math-7', from: 7, to: 8 });
  });

  it('хуудасгүй дараагийн хичээлийг алгасна; boss эсвэл хуудасгүй хичээл бол null', () => {
    const gap = [...pages];
    gap[1] = null;
    expect(lessonPages(book(gap), 0)).toEqual({ slug: 'math-7', from: 5, to: 8 });
    expect(lessonPages(book(gap), 1)).toBeNull();
    expect(lessonPages(book(pages), 15)).toBeNull();
    expect(lessonPages(book([]), 0)).toBeNull();
  });

  it('дараагийн хичээл ижил хуудаснаас эхэлбэл тэр нэг хуудас', () => {
    expect(lessonPages(book([5, 5, ...pages.slice(2)]), 0)).toEqual({ slug: 'math-7', from: 5, to: 5 });
  });
});

describe('bookOfRef', () => {
  it('сурах замын бодлогын bookRef-ээс номын анги', () => {
    expect(bookOfRef('math-6:7-9')).toEqual({ ref: 'math-6:7-9', grade: 6 });
    expect(bookOfRef('math-10-2019:3')).toEqual({ ref: 'math-10-2019:3', grade: 10 });
    expect(bookOfRef('буруу')).toBeNull();
    expect(bookOfRef(undefined)).toBeNull();
  });
});
