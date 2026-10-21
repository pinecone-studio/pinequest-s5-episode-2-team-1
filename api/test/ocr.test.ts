import { describe, expect, it } from 'vitest';
import { parseOcrPages, toBase64 } from '../src/llm/ocr';

describe('parseOcrPages', () => {
  it('хавсралтын дарааллаар (page талбараар) текстийг буцааж, ```markdown хүрээг авна', () => {
    const raw = {
      pages: [
        { page: 2, markdown: '```markdown\n## Тэгшитгэл\n$x + 2 = 5$\n```' },
        { page: 1, markdown: '# Бутархай' },
      ],
    };
    expect(parseOcrPages(raw, 2)).toEqual(['# Бутархай', '## Тэгшитгэл\n$x + 2 = 5$']);
  });

  it('page буруу бол дарааллаар нь, хоосон хуудас ч зөв', () => {
    expect(parseOcrPages({ pages: [{ page: 9, markdown: 'а' }, { markdown: '' }] }, 2)).toEqual(['а', '']);
  });

  it('хуудас дутуу эсвэл бүтэц буруу бол алдаа', () => {
    expect(() => parseOcrPages({ pages: [{ page: 1, markdown: 'а' }] }, 2)).toThrow(/2-р хавсралт/);
    expect(() => parseOcrPages({ text: 'x' }, 1)).toThrow(/pages алга/);
    expect(() => parseOcrPages(null, 1)).toThrow(/pages алга/);
  });
});

describe('toBase64', () => {
  it('том файлыг ч зөв кодлоно', () => {
    expect(toBase64(new TextEncoder().encode('ABC'))).toBe('QUJD');
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    const decoded = Uint8Array.from(atob(toBase64(big)), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(big);
  });
});
