import { describe, expect, it } from 'vitest';
import { isTotp, RECOVERY_CODE, safeNext, validateLogin, validateRegister } from './validation';

describe('validateLogin', () => {
  it('to‘g‘ri ma’lumotda xato yo‘q', () => {
    expect(validateLogin({ email: 'a@b.uz', password: 'x' })).toEqual({});
  });
  it('noto‘g‘ri emailni ushlaydi', () => {
    expect(validateLogin({ email: 'abc', password: 'x' }).email).toBeDefined();
  });
});

describe('validateRegister', () => {
  const ok = { username: 'demo_1', email: 'a@b.uz', name: '', password: '12345678', confirm: '12345678' };
  it('to‘g‘ri ma’lumot', () => expect(validateRegister(ok)).toEqual({}));
  it('qisqa username va parol', () => {
    const e = validateRegister({ ...ok, username: 'ab', password: '123', confirm: '123' });
    expect(e.username).toBeDefined();
    expect(e.password).toBeDefined();
  });
  it('parollar mos kelmasa', () => expect(validateRegister({ ...ok, confirm: 'x' }).confirm).toBeDefined());
});

describe('kodlar', () => {
  it('TOTP 6 raqam', () => {
    expect(isTotp('123456')).toBe(true);
    expect(isTotp('12345')).toBe(false);
  });
  it('tiklash kodi 32 hex', () => {
    expect(RECOVERY_CODE.test('a'.repeat(32))).toBe(true);
    expect(RECOVERY_CODE.test('xyz')).toBe(false);
  });
});

describe('safeNext', () => {
  it('ichki yo‘lni qoldiradi', () => expect(safeNext('/settings/security')).toBe('/settings/security'));
  it('tashqi manzillarni rad etadi', () => {
    expect(safeNext('https://evil.com')).toBe('/dashboard');
    expect(safeNext('//evil.com')).toBe('/dashboard');
    expect(safeNext('/\\evil.com')).toBe('/dashboard');
  });
  it('login sahifasiga qaytarmaydi', () => expect(safeNext('/login')).toBe('/dashboard'));
});
