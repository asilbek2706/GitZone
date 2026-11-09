# Authentication (Phase 28)

## Oqim
- **Login/Register**: backend `accessToken` ni JSON'da, `refreshToken` ni **httpOnly cookie**'da beradi.
- **Access token** faqat Redux xotirasida (`auth.accessToken`). localStorage/sessionStorage'ga yozilmaydi.
- **Sahifa yangilanganda**: `AuthBootstrap` `POST /api/auth/refresh` ni chaqirib sessiyani jim tiklaydi (holat `unknown` -> `authenticated|anonymous`).
- **401 bo'lsa**: `baseApi` bitta `refreshSession()` orqali tokenni yangilaydi va so'rovni qaytaradi. Refresh bir vaqtda faqat BITTA yuboriladi (backend rotation + reuse detection tufayli).
- **Logout**: `POST /api/auth/logout`, so'ng holat va RTK Query keshi tozalanadi.
- **2FA login**: login `requiresTwoFactor: true` + `challengeToken` qaytaradi, keyin `/2fa/login/verify` yoki `/2fa/login/recovery`.

## Yo'llar
Brauzer API so'rovlari `NEXT_PUBLIC_API_URL` orqali backend `http://localhost:5000/api/*` ga yuboriladi. Backend `CORS_ORIGIN` frontend manziliga (`http://localhost:3000`) mos bo'lishi kerak.

## Himoya
- `(app)` guruhi `AuthGate` ichida: kirmagan foydalanuvchi `/login?next=...` ga yo'naltiriladi.
- `(auth)` guruhi `GuestGate`: kirgan foydalanuvchi panelga o'tadi. `next` faqat sayt ichidagi yo'l bo'lishi mumkin (`safeNext`).

## Sozlamalar sahifasi: /settings/security
Sessiyalar, personal access tokenlar, 2FA (QR, tasdiqlash, tiklash kodlari, o'chirish). Tiklash kodlari va yangi token faqat komponent holatida turadi.

## Backend uchun tavsiyalar
- `AuthUser` ga `twoFactorEnabled` qo'shing: hozir UI 2FA holatini oldindan bila olmaydi.
- `AuthSession` ga `isCurrent` qo'shing: "joriy sessiya" belgilanmaydi.
