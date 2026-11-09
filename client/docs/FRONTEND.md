# GitZone Client: hujjat

## Stek
Next.js (App Router) + TypeScript (strict) + SCSS Modules + Redux Toolkit (RTK Query). Testlar: Vitest + Testing Library.

## Buyruqlar
| Buyruq | Vazifa |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` / `npm start` | Production build va ishga tushirish |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run api:types` | `openapi.json` dan `src/lib/api/schema.d.ts` yaratadi |

## Muhit
`.env.example` ni `.env.local` ga nusxalang. `API_URL`: backend manzili (faqat serverda o'qiladi). Brauzer `/backend/*` ga murojaat qiladi, Next uni `API_URL` ga yo'naltiradi (next.config.ts), shuning uchun CORS kerak emas.

## Tuzilma
```
src/app/            marshrutlar: (app) guruhi ichida panel bilan sahifalar
src/components/     brand, ui, form, feedback, layout, providers
src/features/       sahifa darajasidagi mantiq (dashboard, ui-kit, keyin auth, repos...)
src/hooks/          useTheme, useToast
src/lib/            api (RTK Query), env, cn
src/store/          store, slices
src/styles/         tokens, reset, globals
```

## Qoidalar
- Server komponent default; `'use client'` faqat holat/hodisa kerak joyda.
- Yangi endpoint: `baseApi.injectEndpoints` (qarang: `src/lib/api/healthApi.ts`).
- Rang va o'lchamlar faqat CSS variable (`src/styles/_tokens.scss`) orqali.
- Har sahifada loading / error / bo'sh holat bo'lsin.
- Forma maydonlari `Field` bilan o'raladi (label va xato avtomatik bog'lanadi).

## Mavzu
`<html data-theme>`; tanlov `localStorage('gz-theme')` da saqlanadi, layout'dagi inline skript sahifa chizilishidan oldin qo'llaydi.

## Accessibility
Skip-link, `:focus-visible`, landmarklar (`nav`, `main`), `aria-live` toastlar, `prefers-reduced-motion`, forma xatolari `role="alert"`.
