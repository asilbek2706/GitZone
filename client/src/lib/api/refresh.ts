import type { AuthData } from '@/features/auth/types';

let inflight: Promise<AuthData | null> | null = null;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Refresh token cookie orqali yangi access token oladi.
 * Backend refresh tokenni har safar almashtiradi (rotation) va qayta ishlatilsa sessiyani bekor qiladi,
 * shuning uchun bir vaqtdagi barcha chaqiruvlar BITTA so'rovga birlashtiriladi.
 */
export function refreshSession(): Promise<AuthData | null> {
  if (!inflight) {
    inflight = fetch(`${API_BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } })
      .then(async (res) => (res.ok ? ((await res.json()) as { data: AuthData }).data : null))
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}
