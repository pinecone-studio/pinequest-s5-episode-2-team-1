import { describe, expect, it } from 'vitest';
import { shouldGenerateTemplates, type Template } from '../src/templates';

const make = () => ({ prompt: '1 + 1?', options: ['2', '3', '4', '5'], explanation: '2' });
const special: Template = { ref: 'math-6:5', id: 'special', make };
const general: Template = { ref: 'math-6:5', id: 'general', preferStored: true, make };

describe('shouldGenerateTemplates', () => {
  it('загваргүй бол үүсгэхгүй', () => expect(shouldGenerateTemplates([], 0, 5)).toBe(false));
  it('тусгай загвар үргэлж үүсгэнэ', () => expect(shouldGenerateTemplates([special], 25, 5)).toBe(true));
  it('ерөнхий загвар хадгалсан асуултыг орлохгүй', () => expect(shouldGenerateTemplates([general], 25, 5)).toBe(false));
  it('хадгалсан асуулт дутвал ерөнхий загвар нөхнө', () => expect(shouldGenerateTemplates([general], 4, 5)).toBe(true));
});
