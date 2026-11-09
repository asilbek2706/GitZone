# Frontend security review (Phase 28)

| Mavzu | Holat |
|---|---|
| Refresh token | httpOnly cookie, JS ko'rmaydi |
| Access token | Faqat xotirada; sahifa yangilansa refresh bilan tiklanadi |
| XSS | `dangerouslySetInnerHTML` faqat o'zimiz yozgan statik SVG va tema skriptida; foydalanuvchi matni hech qachon HTML sifatida chiqarilmaydi |
| Open redirect | `next` parametri `safeNext` bilan tekshiriladi |
| CSRF | `/api/auth/refresh` cookie bilan ishlaydigan POST. Backend cookie'ga `SameSite=Lax` yoki `Strict` qo'yishi SHART (tekshiring) |
| Refresh poygasi | Bitta so'rovga birlashtiriladi (rotation/reuse himoyasi) |
| Tiklash kodlari | Faqat komponent holatida, bir marta; saqlamay chiqishda ogohlantirish |
| PAT | To'liq token faqat yaratilganda; ro'yxatda prefiks |
| Headerlar | nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Qolgan ish | CSP (nonce bilan), rate-limit xabarlari (429), parolni ko'rsatish tugmasi |
