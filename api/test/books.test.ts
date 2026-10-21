import { describe, expect, it } from 'vitest';
import { bookMetaSchema, isPageMime, pageKey } from '../src/config/books';

describe('pageKey', () => {
  it('R2 түлхүүр: <slug>/p<4 оронтой дугаар>.<өргөтгөл>', () => {
    expect(pageKey('mongolian-7', 45, 'image/jpeg')).toBe('mongolian-7/p0045.jpg');
    expect(pageKey('math-10', 1, 'application/pdf')).toBe('math-10/p0001.pdf');
    expect(pageKey('math-10', 1234, 'image/webp')).toBe('math-10/p1234.webp');
  });
});

describe('isPageMime', () => {
  it('зөвхөн pdf, jpeg, png, webp', () => {
    expect(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].every(isPageMime)).toBe(true);
    expect(isPageMime('image/heic')).toBe(false);
    expect(isPageMime('toString')).toBe(false);
    expect(isPageMime(undefined)).toBe(false);
  });
});

describe('bookMetaSchema', () => {
  it('заавал биш талбарт анхдагч утга өгнө', () => {
    expect(bookMetaSchema.parse({ subject: 'math', grade: 7, title: ' Математик 7 ', source: 'web' })).toEqual({
      subject: 'math',
      grade: 7,
      title: 'Математик 7',
      year: null,
      publisher: null,
      source: 'web',
      pageOffset: 0,
    });
  });

  it('буруу утгыг татгалзана', () => {
    expect(bookMetaSchema.safeParse({ subject: 'Математик', grade: 7, title: 'x', source: 'scan' }).success).toBe(false);
    expect(bookMetaSchema.safeParse({ subject: 'math', grade: 0, title: 'x', source: 'scan' }).success).toBe(false);
    expect(bookMetaSchema.safeParse({ subject: 'math', grade: 7, title: 'x', source: 'pdf' }).success).toBe(false);
  });
});
