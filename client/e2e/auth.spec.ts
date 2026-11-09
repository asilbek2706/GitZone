import { expect, test, type Page } from '@playwright/test';

const user = {
  id: '1', username: 'demo', email: 'demo@example.com', name: null, avatarUrl: null, bio: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const ok = (data: unknown) => ({ json: { success: true, data } });
const unauthorized = { status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'x' } } };

async function anonymous(page: Page) {
  await page.route('**/api/auth/refresh', (r) => r.fulfill(unauthorized));
  await page.route('**/api/health', (r) => r.fulfill({ json: { success: true, status: 'healthy' } }));
}

test('kirmagan foydalanuvchi /login ga yo‘naltiriladi', async ({ page }) => {
  await anonymous(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('login muvaffaqiyatli bo‘lsa panelga o‘tadi', async ({ page }) => {
  await anonymous(page);
  await page.route('**/api/auth/login', (r) => r.fulfill(ok({ requiresTwoFactor: false, user, accessToken: 't' })));
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Parol').fill('password123');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('noto‘g‘ri parolda xato ko‘rsatiladi', async ({ page }) => {
  await anonymous(page);
  await page.route('**/api/auth/login', (r) => r.fulfill(unauthorized));
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Parol').fill('wrong-password');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await expect(page.getByRole('alert')).toContainText('noto‘g‘ri');
});

test('2FA bosqichi: kod bilan kirish', async ({ page }) => {
  await anonymous(page);
  await page.route('**/api/auth/login', (r) => r.fulfill(ok({ requiresTwoFactor: true, challengeToken: 'c', expiresAt: '2030-01-01T00:00:00.000Z' })));
  await page.route('**/api/auth/2fa/login/verify', (r) => r.fulfill(ok({ user, accessToken: 't' })));
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Parol').fill('password123');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.getByLabel('Tasdiqlash kodi').fill('123456');
  await page.getByRole('button', { name: 'Tasdiqlash' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
