
'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { authService } from '@/services/auth.service';
import styles from './LoginPage.module.css';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [tab] = useState<'login' | 'register'>('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verify 2FA
  const verify2FA = async (code: string) => {
    if (code.length !== 6 || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await authService.verifyTwoFactor({
        challengeToken,
        code,
      });

      if (res.data.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorResponse;

      setError(
        apiError.response?.data?.message || "2FA kodi noto'g'ri.",
      );

      setOtpValues(['', '', '', '', '', '']);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
      const updated = [...otpValues];
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    const updated = [...otpValues];

    // Paste support
    if (digits.length > 1) {
      digits
        .slice(0, 6 - index)
        .split('')
        .forEach((digit, i) => {
          updated[index + i] = digit;
        });
    } else {
      updated[index] = digits;
    }

    setOtpValues(updated);

    const nextIndex = Math.min(
      index + digits.length,
      5,
    );

    if (nextIndex < 5 || updated[5] === '') {
      inputRefs.current[nextIndex]?.focus();
    }

    if (updated.every((digit) => digit !== '')) {
      void verify2FA(updated.join(''));
    }
  };

  // Backspace and arrow navigation
  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      e.key === 'Backspace' &&
      !otpValues[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || requires2FA) return;

    setError('');
    setLoading(true);

    try {
      const res = await authService.login({
        email,
        password,
      });

      if (
        res.data.requiresTwoFactor &&
        res.data.challengeToken
      ) {
        setChallengeToken(res.data.challengeToken);
        setRequires2FA(true);
        setOtpValues(['', '', '', '', '', '']);
      } else if (res.data.accessToken) {
        localStorage.setItem(
          'accessToken',
          res.data.accessToken,
        );

        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorResponse;

      setError(
        apiError.response?.data?.message ||
          'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Back to login
  const handleBackToLogin = () => {
    setRequires2FA(false);
    setChallengeToken('');
    setOtpValues(['', '', '', '', '', '']);
    setError('');
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

            <p className={styles.brandDescription}>
              Kodingiz uchun o‘z hududingiz.
            </p>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.statusDot} />
            Secure Developer Platform
          </div>
        </aside>

        {/* RIGHT AUTH PANEL */}
        <section className={styles.authPanel}>
          <div className={styles.authContent}>
            {/* Heading */}
            <header className={styles.heading}>
              <div className={styles.welcomeBadge}>
                <span />
                GitZone Community
              </div>

              <h2>
                {requires2FA
                  ? 'Hisobingizni tasdiqlang'
                  : 'Xush kelibsiz'}
              </h2>

              <p>
                {requires2FA
                  ? 'Authenticator ilovasidagi 6 xonali kodni kiriting.'
                  : 'GitZone hisobingizga kiring va kod yozishni davom ettiring.'}
              </p>
            </header>

            {/* Error */}
            {error && (
              <div className={styles.error} role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            {!requires2FA && (
              <>
                <form
                  onSubmit={handleSubmit}
                  className={styles.form}
                >
                  <div className={styles.field}>
                    <label htmlFor="email">
                      Email yoki username
                    </label>

                    <input
                      id="email"
                      type="text"
                      required
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="email@example.com"
                      autoComplete="username"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="password">
                      Parol
                    </label>

                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        Kirish
                        <span className={styles.buttonArrow}>
                          →
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {/* REGISTER LINK */}
                <div className={styles.authSwitch}>
                  <span>Akkauntingiz yo‘qmi?</span>

                  <Link href="/register">
                    Ro‘yxatdan o‘tish
                    <span> →</span>
                  </Link>
                </div>
              </>
            )}

            {/* 2FA — ONLY WHEN REQUIRED */}
            {requires2FA && (
              <div className={styles.twoFactor}>
                <div className={styles.twoFactorHeader}>
                  <div className={styles.lockIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <div>
                    <h3>2FA tasdiqlash</h3>
                    <p>
                      6 xonali xavfsizlik kodini kiriting.
                    </p>
                  </div>
                </div>

                {/* OTP INPUTS */}
                <div className={styles.otpContainer}>
                  {otpValues.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={
                        index === 0 ? 'one-time-code' : 'off'
                      }
                      maxLength={6}
                      value={digit}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                      onChange={(e) =>
                        handleOtpChange(
                          index,
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) =>
                        handleOtpKeyDown(index, e)
                      }
                    />
                  ))}
                </div>

                {/* VERIFY BUTTON */}
                <button
                  type="button"
                  onClick={() =>
                    void verify2FA(otpValues.join(''))
                  }
                  disabled={
                    loading ||
                    otpValues.some((digit) => !digit)
                  }
                  className={styles.submitButton}
                >
                  {loading
                    ? 'Tekshirilmoqda...'
                    : 'Tasdiqlash'}
                </button>

                {/* BACK BUTTON */}
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={handleBackToLogin}
                  disabled={loading}
                >
                  ← Orqaga qaytish
                </button>
              </div>
            )}

            {/* FOOTER */}
            <footer className={styles.authFooter}>
              <span className={styles.footerLine} />

              <p>
                Protected by{' '}
                <strong>GitZone Security</strong>
              </p>

              <span className={styles.footerLine} />
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
