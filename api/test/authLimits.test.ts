import { describe, expect, it } from 'vitest';
import { networkOf } from '../src/services/authLimits';

describe('networkOf', () => {
  it('IPv4 бүтнээрээ, header-гүй бол local', () => {
    expect(networkOf('203.0.113.7')).toBe('203.0.113.7');
    expect(networkOf(undefined)).toBe('local');
  });

  it("IPv6: '::'-г задалж /64 авна, нэг /64-ийн хаягууд нэг түлхүүртэй", () => {
    expect(networkOf('2001:db8::1:2:3:4')).toBe('2001:db8:0:0');
    expect(networkOf('2001:db8::5:6:7:8')).toBe('2001:db8:0:0');
    expect(networkOf('2001:0DB8:0:0:9::1')).toBe('2001:db8:0:0');
    expect(networkOf('2001:db8:abcd:12::1')).toBe('2001:db8:abcd:12');
    expect(networkOf('2001:db8:abcd:13::1')).not.toBe(networkOf('2001:db8:abcd:12::1'));
  });

  it('IPv4-mapped IPv6 нь IPv4 шиг тус бүртээ', () => {
    expect(networkOf('::ffff:203.0.113.7')).not.toBe(networkOf('::ffff:203.0.113.8'));
  });
});
