import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { samplePdf } from './books-fixtures';
import { assessText, extractPdfText, fixLegacyCyrillic, TextCache } from './books-text';

const root = mkdtempSync(join(tmpdir(), 'books-text-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('fixLegacyCyrillic', () => {
  it('хуучин cp1251 фонтоор бичигдсэн үгсийг кирилл болгоно (ө, ү, ъ, ь, ё)', () => {
    expect(fixLegacyCyrillic('ÌÀÒÅÌÀÒÈÊ VI')).toBe('МАТЕМАТИК VI');
    expect(fixLegacyCyrillic('Ред. Мºíõæàðãàë Д.')).toBe('Ред. Мөнхжаргал Д.');
    expect(fixLegacyCyrillic('Д.Т¿âøèíæàðãàë, Åðºíõèé')).toBe('Д.Түвшинжаргал, Ерөнхий');
    expect(fixLegacyCyrillic('задалúя, олúё, нü, ñî¸ë')).toBe('задалъя, олъё, нь, соёл');
    expect(fixLegacyCyrillic('ÌÎÍÃÎË ªÐÃªÍ ¯ÍÄÝÑ')).toBe('МОНГОЛ ӨРГӨН ҮНДЭС');
  });

  it('эвдэрсэн үгийн доторх ÷, × нь ч, Ч', () => {
    expect(fixLegacyCyrillic('Çîõèîã÷èéí')).toBe('Зохиогчийн');
  });

  it('энгийн текстийн математик тэмдэгтийг хөндөхгүй', () => {
    for (const s of ['3 × 4 = 12', '12 ÷ 3', 'ab×c', 'x² + y³', '12°С-аар', '×Төмсний', '½ хувь', 'Бүхэл тоо']) {
      expect(fixLegacyCyrillic(s)).toBe(s);
    }
  });

  it('зураглалгүй үржих цэгийг (�) хоёр гишүүний хооронд · болгоно', () => {
    expect(fixLegacyCyrillic('(−3)�4=−12')).toBe('(−3)·4=−12');
    expect(fixLegacyCyrillic('3 � 3 хэмжээтэй')).toBe('3 · 3 хэмжээтэй');
    expect(fixLegacyCyrillic('� тэмдэг')).toBe('� тэмдэг');
  });
});

describe('assessText', () => {
  const cyr = 'Бүхэл тоонуудыг жиших дүрмийг ажиглаарай. '.repeat(5);

  it('ok / poor / empty', () => {
    expect(assessText(cyr).quality).toBe('ok');
    expect(assessText(`${cyr}�`).quality).toBe('poor');
    expect(assessText('12 34 56').quality).toBe('empty');
    expect(assessText('').quality).toBe('empty');
  });

  it('× ÷ ° зэрэг тэмдгийг эвдрэл гэж тоолохгүй', () => {
    expect(assessText(`${cyr} 3 × 4 ÷ 2 = 6 12° `).bad).toBe(0);
  });
});

describe('extractPdfText', () => {
  it('PDF-ийн текст давхаргыг хуудас, мөрөөр нь гаргана', async () => {
    expect(await extractPdfText(await samplePdf(2, 'Line'))).toBe('Line 1\nLine 2');
  });

  it('PDF биш бол алдаа', async () => {
    await expect(extractPdfText(new TextEncoder().encode('not a pdf'))).rejects.toThrow();
  });
});

describe('TextCache', () => {
  it('sha256 таарвал (гараар зассан ч) .md-ийн текстийг, үгүй бол null', () => {
    const dir = join(root, 'math-6');
    mkdirSync(dir);
    const cache = new TextCache(dir);
    cache.set(45, { sha256: 'aaa', method: 'pdf-text', quality: 'ok' }, 'анхны текст');
    cache.save();
    writeFileSync(join(dir, 'text', '0045.md'), 'гараар зассан текст');

    const again = new TextCache(dir);
    expect(again.get(45, 'aaa')).toEqual({ sha256: 'aaa', method: 'pdf-text', quality: 'ok', text: 'гараар зассан текст' });
    expect(again.get(45, 'bbb')).toBeNull();
    expect(again.get(46, 'aaa')).toBeNull();
  });
});
