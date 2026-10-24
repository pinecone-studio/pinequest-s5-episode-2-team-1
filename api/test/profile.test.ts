import { describe, expect, it } from 'vitest';
import { newProfileCode, normalizeProfileCode, parseBearLook } from '../src/domain/profile';

describe('профайлын код', () => {
  it('8 оронтой цифр үүсгэнэ (0-ээр эхэлж болно)', () => {
    for (let i = 0; i < 200; i++) expect(newProfileCode()).toMatch(/^\d{8}$/);
  });

  it('давтагдах нь ховор', () => {
    const codes = new Set(Array.from({ length: 500 }, newProfileCode));
    expect(codes.size).toBeGreaterThan(495);
  });

  it('зай, зураасыг хасаж уншина', () => {
    expect(normalizeProfileCode('4821 9137')).toBe('48219137');
    expect(normalizeProfileCode(' 4821-9137 ')).toBe('48219137');
    expect(normalizeProfileCode('01234567')).toBe('01234567');
  });

  it('урт таарахгүй бол null (тулааны 6 оронтой код ч)', () => {
    expect(normalizeProfileCode('482913')).toBeNull();
    expect(normalizeProfileCode('482191370')).toBeNull();
    expect(normalizeProfileCode('abcdefgh')).toBeNull();
    expect(normalizeProfileCode('')).toBeNull();
  });
});

describe('баавгайн харагдац', () => {
  it('хадгалсан дэвсгэр, хувцсыг уншина', () => {
    expect(parseBearLook('{"bg":"shunu","outfit":"gradcap"}')).toEqual({ bg: 'shunu', outfit: 'gradcap' });
  });

  it('хоосон эсвэл эвдэрсэн бол анхдагч', () => {
    expect(parseBearLook(null)).toEqual({ bg: 'nimbeg', outfit: 'scarf' });
    expect(parseBearLook('{')).toEqual({ bg: 'nimbeg', outfit: 'scarf' });
    expect(parseBearLook('"tal"')).toEqual({ bg: 'nimbeg', outfit: 'scarf' });
  });

  it('дутуу талбарыг анхдагчаар нөхнө', () => {
    expect(parseBearLook('{"bg":"tal"}')).toEqual({ bg: 'tal', outfit: 'scarf' });
    expect(parseBearLook('{"bg":3,"outfit":"glasses"}')).toEqual({ bg: 'nimbeg', outfit: 'glasses' });
  });
});
