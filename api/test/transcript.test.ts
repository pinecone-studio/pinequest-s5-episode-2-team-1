import { describe, expect, it } from 'vitest';
import { fixTranscript } from '../../shared/transcript';

describe('fixTranscript (баавгайн хариулт самбар дээр)', () => {
  it('ярианы бичлэгийн байнгын алдааг засна', () => {
    expect(fixTranscript('2-ыг гурван удаа өөртөөр нь үржүүлнэ')).toBe('2-ыг гурван удаа өөрөөр нь үржүүлнэ');
    expect(fixTranscript('Тэгшитгэл бол хоёр тал нь тэнцүү дэнлүүр.')).toBe('Тэгшитгэл бол хоёр тал нь тэнцүү жинлүүр.');
    expect(fixTranscript('Төсөөлөө дөө')).toBe('Төсөөлөөд үз дээ');
    expect(fixTranscript('дєрєв')).toBe('дөрөв');
    expect(fixTranscript('іжил бутархай')).toBe('ижил бутархай');
  });

  it('томьёонд хэлсэн "минус", "тэнцүү"-г тэмдэг болгоно', () => {
    expect(fixTranscript('3x минус 7 тэнцүү 11 гэсэн тэгшитгэл')).toBe('3x − 7 = 11 гэсэн тэгшитгэл');
    expect(fixTranscript('x тэнцүү 6 гэсэн хариу')).toBe('x = 6 гэсэн хариу');
    expect(fixTranscript('a² тэнцүү (b + c)')).toBe('a² = (b + c)');
    expect(fixTranscript('Жишээлбэл, −3 х −3 = 9 болно.')).toBe('Жишээлбэл, −3 · −3 = 9 болно.');
    expect(fixTranscript('x хувьсагч')).toBe('x хувьсагч');
  });

  it('LaTeX-ийг энгийн тэмдэг болгоно', () => {
    expect(fixTranscript('Иймд $2^3 \\cdot 2^4 = 2^7$ гарна.')).toBe('Иймд 2³ · 2⁴ = 2⁷ гарна.');
    expect(fixTranscript('$2^{3+4}$, $x = \\pm 3$, $\\frac{1}{2}$, $\\sqrt{9}$')).toBe('2³⁺⁴, x = ± 3, 1/2, √9');
  });

  it('энгийн өгүүлбэр дэх "тэнцүү"-г хөндөхгүй', () => {
    expect(fixTranscript('хоёр тал нь тэнцүү байна')).toBe('хоёр тал нь тэнцүү байна');
    expect(fixTranscript('6 тэнцүү биш')).toBe('6 тэнцүү биш');
  });
});
