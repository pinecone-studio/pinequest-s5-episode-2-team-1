import { describe, expect, it } from 'vitest';
import { newProfileCode, normalizeProfileCode, parseBearLook } from '../src/domain/profile';
import { onboardingSubject } from '../src/services/users';

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
  const bear = { fur: 'brown', face: 'calm', chest: true };

  it('хадгалсан дэвсгэр, хувцсыг уншина', () => {
    expect(parseBearLook('{"bg":"shunu","outfit":"gradcap"}')).toEqual({ bg: 'shunu', outfit: 'gradcap', ...bear });
  });

  it('хоосон эсвэл эвдэрсэн бол анхдагч', () => {
    expect(parseBearLook(null)).toEqual({ bg: 'nimbeg', outfit: 'scarf', ...bear });
    expect(parseBearLook('{')).toEqual({ bg: 'nimbeg', outfit: 'scarf', ...bear });
    expect(parseBearLook('"tal"')).toEqual({ bg: 'nimbeg', outfit: 'scarf', ...bear });
  });

  it('дутуу талбарыг анхдагчаар нөхнө', () => {
    expect(parseBearLook('{"bg":"tal"}')).toEqual({ bg: 'tal', outfit: 'scarf', ...bear });
    expect(parseBearLook('{"bg":3,"outfit":"glasses"}')).toEqual({ bg: 'nimbeg', outfit: 'glasses', ...bear });
  });

  it('үс, царай, цээжний толбыг уншина; мэдэгдэхгүй утга бол анхдагч', () => {
    expect(parseBearLook('{"fur":"black","face":"sleepy","chest":false}')).toEqual({ bg: 'nimbeg', outfit: 'scarf', fur: 'black', face: 'sleepy', chest: false });
    expect(parseBearLook('{"fur":"pink","face":"angry","chest":"no"}')).toEqual({ bg: 'nimbeg', outfit: 'scarf', ...bear });
  });
});

describe('асуулгад сонгосон хичээл (шинэ төхөөрөмж дээр асуулгыг дахин асуухгүй)', () => {
  it('users.onboarding JSON-оос; байхгүй, буруу бол null', () => {
    expect(onboardingSubject('{"heardFrom":"friends","subject":"physics","level":2}')).toBe('physics');
    expect(onboardingSubject('{}')).toBeNull(); // migration 0028-аас өмнөх хэрэглэгч
    expect(onboardingSubject(null)).toBeNull();
    expect(onboardingSubject('{"subject":"chemistry"}')).toBeNull();
    expect(onboardingSubject('эвдэрсэн')).toBeNull();
  });
});
