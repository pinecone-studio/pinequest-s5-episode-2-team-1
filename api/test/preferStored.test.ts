import { describe, expect, it } from 'vitest';
import { shouldGenerateTemplates, type Template } from '../src/templates';

const make = () => ({ prompt: '1 + 1?', options: ['2', '3', '4', '5'], explanation: '2' });
const special: Template = { ref: 'math-6:5', id: 'special', make };
const general: Template = { ref: 'math-6:5', id: 'general', preferStored: true, make };

describe('shouldGenerateTemplates', () => {
  it('загваргүй бол үүсгэхгүй', () => expect(shouldGenerateTemplates([], 0, 5)).toBe(false));
  it('Суурь шат тусгай, ерөнхий аль ч template-ийн оронд DB ашиглана', () => {
    expect(shouldGenerateTemplates([special], 25, 5, 1)).toBe(false);
    expect(shouldGenerateTemplates([general], 25, 5, 1)).toBe(false);
  });
  it('Суурийн DB асуулт дутвал template нөхнө', () => expect(shouldGenerateTemplates([general], 4, 5, 1)).toBe(true));
  it('Дунд, Ахисан шат DB-ийн тооноос үл хамааран template ашиглана', () => {
    expect(shouldGenerateTemplates([general], 25, 5, 2)).toBe(true);
    expect(shouldGenerateTemplates([general], 25, 5, 3)).toBe(true);
  });
  it('шатгүй урсгалд тусгай template үргэлж, ерөнхий template зөвхөн DB дутвал', () => {
    expect(shouldGenerateTemplates([special], 25, 5)).toBe(true);
    expect(shouldGenerateTemplates([general], 25, 5)).toBe(false);
    expect(shouldGenerateTemplates([general], 4, 5)).toBe(true);
  });
});
