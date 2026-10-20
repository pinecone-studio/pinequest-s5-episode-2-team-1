import { describe, expect, it } from 'vitest';
import { hashPassword, newSessionToken, normalizeUsername, sha256Hex, usernameError, verifyPassword } from '../src/lib/auth';

describe('PBKDF2 нууц үг', () => {
  it('зөв нууц үгийг танина, буруугийн татгалзана', async () => {
    const stored = await hashPassword('nuuts123', 1000);
    expect(stored).toMatch(/^pbkdf2\$1000\$[^$]+\$[^$]+$/);
    expect(await verifyPassword('nuuts123', stored)).toBe(true);
    expect(await verifyPassword('nuuts124', stored)).toBe(false);
  });

  it('ижил нууц үг өөр salt-тай тул өөр hash гарна', async () => {
    const a = await hashPassword('same-pass', 1000);
    const b = await hashPassword('same-pass', 1000);
    expect(a).not.toBe(b);
  });

  it('буруу форматтай hash-ийг хүлээж авахгүй', async () => {
    expect(await verifyPassword('x', 'plain')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$abc$AAAA$AAAA')).toBe(false);
  });

  it('анхдагч iteration 100k (Workers-ийн дээд хязгаар)', async () => {
    const stored = await hashPassword('nuuts123');
    expect(stored.split('$')[1]).toBe('100000');
  });
});

describe('session token', () => {
  it('base64url, 43 тэмдэгт, давтагдахгүй', () => {
    const a = newSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(a);
  });

  it('sha256Hex тогтмол', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('хэрэглэгчийн нэр', () => {
  it('normalize: зай авч жижиг үсэг болгоно (кирилл ч мөн)', () => {
    expect(normalizeUsername('  Бат_01 ')).toBe('бат_01');
    expect(normalizeUsername('ӨНӨР')).toBe('өнөр');
  });

  it('урт ба тэмдэгт шалгана', () => {
    expect(usernameError('ab')).not.toBeNull();
    expect(usernameError('a'.repeat(21))).not.toBeNull();
    expect(usernameError('bat 01')).not.toBeNull();
    expect(usernameError('bat-01')).not.toBeNull();
    expect(usernameError('bat_01')).toBeNull();
    expect(usernameError('сараа7')).toBeNull();
  });
});
