import { describe, expect, it } from 'vitest';
import { newDuelCode, normalizeDuelCode } from '../src/domain/duelCode';

describe('тулааны урилгын код', () => {
  it('6 оронтой цифр үүсгэнэ (0-ээр эхэлж болно)', () => {
    for (let i = 0; i < 200; i++) expect(newDuelCode()).toMatch(/^\d{6}$/);
  });

  it('давтагдах нь ховор', () => {
    const codes = new Set(Array.from({ length: 200 }, newDuelCode));
    expect(codes.size).toBeGreaterThan(190);
  });

  it('зай, зураасыг хасаж уншина', () => {
    expect(normalizeDuelCode('482 913')).toBe('482913');
    expect(normalizeDuelCode(' 482-913 ')).toBe('482913');
    expect(normalizeDuelCode('012345')).toBe('012345');
  });

  it('урт таарахгүй бол null', () => {
    expect(normalizeDuelCode('48291')).toBeNull();
    expect(normalizeDuelCode('4829130')).toBeNull();
    expect(normalizeDuelCode('abcdef')).toBeNull();
    expect(normalizeDuelCode('')).toBeNull();
  });
});
