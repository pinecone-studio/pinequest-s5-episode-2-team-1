import { describe, expect, it } from 'vitest';
import { clanTitle, defaultClanName, genitive, normalizeClanName, peakProgress, PEAKS } from '../../shared/clan';
import { newClanCode, normalizeClanCode } from '../src/domain/clanCode';
import { weekStart } from '../src/domain/time';

describe('Уулын нэр (харьяалахын тийн ялгал)', () => {
  it.each([
    ['Төгсбилэг', 'Төгсбилэгийн'],
    ['Болд', 'Болдын'],
    ['Хүрэлбаатар', 'Хүрэлбаатарын'],
    ['Мөнх', 'Мөнхийн'],
    ['Батзориг', 'Батзоригийн'],
    ['Ганхуяг', 'Ганхуягийн'],
    ['Нямдорж', 'Нямдоржийн'],
    ['Дулмаа', 'Дулмаагийн'],
    ['Туяа', 'Туяагийн'],
    ['Сарнай', 'Сарнайн'],
    ['Батсүрэн', 'Батсүрэнгийн'],
    ['Энхсайхан', 'Энхсайханы'],
    ['Солонго', 'Солонгын'],
    ['Бат-Эрдэнэ', 'Бат-Эрдэнийн'],
    ['Байгаль', 'Байгалийн'],
  ])('%s → %s', (name, expected) => {
    expect(genitive(name)).toBe(expected);
  });

  it('зөвхөн сүүлийн үгийг хувиргана', () => {
    expect(genitive('Улаан баавгай')).toBe('Улаан баавгайн');
  });

  it('латин нэрэнд "-ийн" залгана', () => {
    expect(genitive('Tugsbileg')).toBe('Tugsbileg-ийн');
  });

  it('гарчиг нь " Уул"', () => {
    expect(clanTitle(defaultClanName('Төгсбилэг'))).toBe('Төгсбилэгийн анги');
  });

  it('"Уул"-ыг давхар бичсэнийг хасаж, зайг цэгцэлнэ', () => {
    expect(normalizeClanName('  6А   ангийн Уул ')).toBe('6А ангийн');
    expect(normalizeClanName('Төгсбилэгийн уул')).toBe('Төгсбилэгийн');
    expect(normalizeClanName('Уул')).toBe('');
    expect(normalizeClanName('6А анги')).toBe('6А');
    expect(clanTitle('6А ангийн')).toBe('6А анги');
    expect(clanTitle('6А анги')).toBe('6А анги');
    expect(normalizeClanName('а'.repeat(40))).toHaveLength(24);
  });

  it('хоосон нэрийн оронд анхдагч', () => {
    expect(defaultClanName('  ')).toBe('Баавгайн');
  });
});

describe('Уулын код', () => {
  it('6 оронтой цифр', () => {
    for (let i = 0; i < 200; i++) expect(newClanCode()).toMatch(/^\d{6}$/);
  });

  it('зай, зураасыг хасаж уншина; урт таарахгүй бол null (профайлын 8 оронтой код ч)', () => {
    expect(normalizeClanCode('482 913')).toBe('482913');
    expect(normalizeClanCode('48219137')).toBeNull();
    expect(normalizeClanCode('')).toBeNull();
  });
});

describe('Уулын өндөр', () => {
  it('дараагийн оргил', () => {
    expect(peakProgress(0)).toEqual({ passed: null, next: PEAKS[0] });
    expect(peakProgress(40).passed).toEqual(PEAKS[0]);
    expect(peakProgress(1000)).toEqual({ passed: PEAKS[2], next: PEAKS[3] });
    expect(peakProgress(9000)).toEqual({ passed: PEAKS[PEAKS.length - 1], next: null });
  });
});

describe('7 хоногийн эхлэл', () => {
  it('Даваа гараг', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // Даваа
    expect(weekStart('2026-10-29')).toBe('2026-10-26'); // Пүрэв
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // Ням
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
  });
});
