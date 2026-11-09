import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

type Overrides = Partial<Record<number, string>>;

const isFetchError = (e: unknown): e is FetchBaseQueryError =>
  typeof e === 'object' && e !== null && 'status' in e;

export const hasStatus = (e: unknown, status: number) => isFetchError(e) && e.status === status;

// Backend xatosi: { success:false, error:{ code, message } }
function backendMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as { message?: unknown; error?: { message?: unknown } };
  if (typeof d.error?.message === 'string') return d.error.message;
  if (typeof d.message === 'string') return d.message;
  return undefined;
}

/** RTK Query xatosini foydalanuvchiga ko'rsatiladigan matnga aylantiradi. `overrides`: status -> matn. */
export function getErrorMessage(error: unknown, overrides: Overrides = {}): string {
  if (isFetchError(error)) {
    if (error.status === 'FETCH_ERROR') return 'Serverga ulanib bo‘lmadi. Internetni tekshiring.';
    if (error.status === 'TIMEOUT_ERROR') return 'Server javob bermadi. Qayta urinib ko‘ring.';
    if (error.status === 'PARSING_ERROR') return 'Serverdan noto‘g‘ri javob keldi.';
    if (typeof error.status === 'number') {
      const custom = overrides[error.status];
      if (custom) return custom;
      const specific = [400, 409, 413, 415].includes(error.status) ? backendMessage(error.data) : undefined;
      if (specific) return specific;
      if (error.status === 401) return 'Tizimga qayta kiring.';
      if (error.status === 403) return 'Bu amal uchun ruxsatingiz yo‘q.';
      if (error.status === 404) return 'So‘ralgan ma’lumot topilmadi.';
      if (error.status === 429) return 'Juda ko‘p urinish. Biroz kutib, qayta urinib ko‘ring.';
      if (error.status >= 500) return 'Serverda xatolik yuz berdi. Keyinroq urinib ko‘ring.';
      return backendMessage(error.data) ?? 'So‘rovni bajarib bo‘lmadi.';
    }
  }
  const message = (error as SerializedError | undefined)?.message;
  return typeof message === 'string' ? message : 'Noma’lum xatolik yuz berdi.';
}
