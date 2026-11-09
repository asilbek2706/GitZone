const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-zA-Z0-9_-]+$/;
export const RECOVERY_CODE = /^[a-fA-F0-9]{32}$/;
export const isTotp = (code: string) => /^\d{6}$/.test(code.trim());

type Errors<K extends string> = Partial<Record<K, string>>;

export function validateLogin(v: { email: string; password: string }): Errors<'email' | 'password'> {
  const e: Errors<'email' | 'password'> = {};
  if (!EMAIL.test(v.email.trim())) e.email = 'To‘g‘ri email kiriting.';
  if (!v.password) e.password = 'Parolni kiriting.';
  else if (v.password.length > 72) e.password = 'Parol 72 belgidan oshmasligi kerak.';
  return e;
}

export function validateRegister(v: {
  username: string; email: string; name: string; password: string; confirm: string;
}): Errors<'username' | 'email' | 'name' | 'password' | 'confirm'> {
  const e: Errors<'username' | 'email' | 'name' | 'password' | 'confirm'> = {};
  const username = v.username.trim();
  if (username.length < 3 || username.length > 30) e.username = 'Username 3–30 belgi bo‘lishi kerak.';
  else if (!USERNAME.test(username)) e.username = 'Faqat harf, raqam, _ va - ishlatish mumkin.';
  const email = v.email.trim();
  if (!EMAIL.test(email) || email.length > 255) e.email = 'To‘g‘ri email kiriting.';
  if (v.name.trim().length > 100) e.name = 'Ism 100 belgidan oshmasligi kerak.';
  if (v.password.length < 8) e.password = 'Parol kamida 8 belgidan iborat bo‘lsin.';
  else if (v.password.length > 72) e.password = 'Parol 72 belgidan oshmasligi kerak.';
  if (v.confirm !== v.password) e.confirm = 'Parollar mos kelmadi.';
  return e;
}

/** Login'dan keyin qaytish manzili: faqat sayt ichidagi yo'l (open-redirect himoyasi). */
export function safeNext(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw.startsWith('/login') || raw.startsWith('/register')) return fallback;
  return raw;
}
