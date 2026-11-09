'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { authService } from '@/services/auth.service';
import styles from '../login/LoginPage.module.css';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function RegisterPage() {
  const router = useRouter();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Register handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await authService.register({
        username,
        email,
        password,
        name,
      });

      if (res.data.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);

        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorResponse;

      setError(apiError.response?.data?.message || "Ro'yxatdan o'tishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      {/* Background effects */}
      <div className={styles.backgroundGlow} />
      <div className={styles.gridBackground} />

      <section className={styles.container}>
        {/* LEFT BRAND PANEL */}
        <aside className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <div className={styles.logoWrapper}>
              <div className={styles.hexagonOuter} />
              <div className={styles.hexagonMiddle} />

              <div className={styles.logo}>
                <Image
                  src="/brand/gitzone-mark.svg"
                  alt="GitZone Logo"
                  width={128}
                  height={128}
                  priority
                />
              </div>
            </div>

            <h1 className={styles.brandTitle}>
              Git<span>Zone</span>
            </h1>

            <p className={styles.brandDescription}>Kodingiz uchun o&apos;z hududingiz.</p>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.statusDot} />
            Secure Developer Platform
          </div>
        </aside>

        {/* RIGHT REGISTER PANEL */}
        <section className={styles.authPanel}>
          <div className={styles.authContent}>
            {/* Heading */}
            <header className={styles.heading}>
              <div className={styles.welcomeBadge}>
                <span />
                Join GitZone Community
              </div>

              <h2>Hisob yarating</h2>

              <p>GitZone hamjamiyatiga qo&apos;shiling. Dasturlash sayohatingizni boshlang.</p>
            </header>

            {/* Error message */}
            {error && (
              <div className={styles.error} role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            {/* Register form */}
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Username */}
              <div className={styles.field}>
                <label htmlFor="username">Username</label>

                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="asilbek"
                  className="flex "
                />
              </div>

              {/* Full name */}
              <div className={styles.field}>
                <label htmlFor="name">
                  To&apos;liq ism
                  <span className={styles.optional}>(ixtiyoriy)</span>
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ismingiz va familiyangiz"
                />
              </div>

              {/* Email */}
              <div className={styles.field}>
                <label htmlFor="email">Email manzil</label>

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              {/* Password */}
              <div className={styles.field}>
                <label htmlFor="password">Parol</label>

                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kamida 8 ta belgi"
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 9 7s-1.7 4-4.3 5.8" />
                        <path d="M6.2 6.2C3.9 7.6 3 10 3 12c0 2 4 7 9 7a10 10 0 0 0 2.5-.3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                <span className={styles.passwordHint}>Kamida 8 ta belgidan foydalaning.</span>
              </div>

              {/* Submit button */}
              <button type="submit" disabled={loading} className={styles.submitButton}>
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Hisob yaratilmoqda...
                  </>
                ) : (
                  <>
                    Hisob yaratish
                    <span className={styles.buttonArrow}>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className={styles.authSwitch}>
              <span>Akkauntingiz mavjudmi?</span>

              <Link href="/login">
                Kirish
                <span> →</span>
              </Link>
            </div>

            {/* Footer */}
            <footer className={styles.authFooter}>
              <span className={styles.footerLine} />

              <p>
                Protected by <strong>GitZone Security</strong>
              </p>

              <span className={styles.footerLine} />
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
