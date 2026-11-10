'use client';

import React, { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

import { authService } from '@/services/auth.service';
import styles from './LoginPage.module.css';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const EMPTY_OTP = ['', '', '', '', '', ''];

export default function LoginPage() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(EMPTY_OTP);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP input references
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle API errors
  const getErrorMessage = (err: unknown, fallback: string) => {
    const apiError = err as ApiErrorResponse;

    return apiError.response?.data?.message || fallback;
  };

  // Login handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading || requires2FA) return;

    setError('');
    setLoading(true);

    try {
      const res = await authService.login({
        email: email.trim(),
        password,
      });

      const data = res.data.data;

      // Check whether 2FA is required
      if (data.requiresTwoFactor) {
        if (!data.challengeToken) {
          throw new Error('2FA challenge token topilmadi.');
        }

        setChallengeToken(data.challengeToken);
        setRequires2FA(true);
        setOtpValues([...EMPTY_OTP]);

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);

        return;
      }

      // Normal login
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);

        toast.success('Muvaffaqiyatli kirdingiz! Xush kelibsiz.');

        router.push('/dashboard');
        return;
      }

      throw new Error('Serverdan kirish tokeni olinmadi.');
    } catch (err: unknown) {
      console.error('API xatoligi:', err); // <--- Shu qatorni qo'shing
      const message = getErrorMessage(err, 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.');

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA
  const verify2FA = async (code: string) => {
    if (code.length !== 6 || loading || !challengeToken) return;

    setLoading(true);
    setError('');

    try {
      const res = await authService.verifyTwoFactor({
        challengeToken,
        code,
      });

      const data = res.data.data;

      if (!data.accessToken) {
        throw new Error('Tasdiqlash tokeni serverdan olinmadi.');
      }

      localStorage.setItem('accessToken', data.accessToken);

      toast.success('Muvaffaqiyatli kirdingiz! Xush kelibsiz.');

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = getErrorMessage(err, "2FA kodi noto'g'ri.");

      setError(message);
      toast.error(message);

      setOtpValues([...EMPTY_OTP]);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (loading) return;

    const digits = value.replace(/\D/g, '');

    if (!digits) {
      const updated = [...otpValues];
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    const updated = [...otpValues];

    // Support pasting a complete OTP code
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

    const nextIndex = Math.min(index + digits.length, 5);

    if (updated.every((digit) => digit !== '')) {
      void verify2FA(updated.join(''));
    } else if (nextIndex < 6) {
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // OTP keyboard navigation
  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Back to login
  const handleBackToLogin = () => {
    setRequires2FA(false);
    setChallengeToken('');
    setOtpValues([...EMPTY_OTP]);
    setError('');
    setLoading(false);
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

            <p className={styles.brandDescription}>Kodingiz uchun o‘z hududingiz.</p>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.statusDot} />
            Secure Developer Platform
          </div>
        </aside>

        {/* RIGHT AUTH PANEL */}
        <section className={styles.authPanel}>
          <div className={styles.authContent}>
            {/* HEADING */}
            <header className={styles.heading}>
              <div className={styles.welcomeBadge}>
                <span />
                GitZone Community
              </div>

              <h2>{requires2FA ? 'Hisobingizni tasdiqlang' : 'Xush kelibsiz'}</h2>

              <p>
                {requires2FA
                  ? 'Authenticator ilovasidagi 6 xonali kodni kiriting.'
                  : 'GitZone hisobingizga kiring va kod yozishni davom ettiring.'}
              </p>
            </header>

            {/* ERROR MESSAGE */}
            {error && (
              <div className={styles.error} role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            {!requires2FA && (
              <>
                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* EMAIL / USERNAME */}
                  <div className={styles.field}>
                    <label htmlFor="email">Email yoki username</label>

                    <input
                      id="email"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className={styles.field}>
                    <label htmlFor="password">Parol</label>

                    <div className={styles.passwordWrapper}>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Parolingizni kiriting"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                        aria-pressed={showPassword}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            aria-hidden="true"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                            <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 9 7s-1.7 4-4.3 5.8" />
                            <path d="M6.2 6.2C3.9 7.6 3 10 3 12c0 2 4 7 9 7a10 10 0 0 0 2.5-.3" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            aria-hidden="true"
                          >
                            <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button type="submit" disabled={loading} className={styles.submitButton}>
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        Kirish
                        <span className={styles.buttonArrow}>→</span>
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

            {/* TWO-FACTOR AUTHENTICATION */}
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
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <div>
                    <h3>2FA tasdiqlash</h3>
                    <p>6 xonali xavfsizlik kodini kiriting.</p>
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
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={6}
                      value={digit}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>

                {/* VERIFY BUTTON */}
                <button
                  type="button"
                  onClick={() => void verify2FA(otpValues.join(''))}
                  disabled={loading || otpValues.some((digit) => !digit)}
                  className={styles.submitButton}
                >
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
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
