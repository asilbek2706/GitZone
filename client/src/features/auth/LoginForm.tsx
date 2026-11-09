'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useLoginMutation, useVerifyTwoFactorLoginMutation, useVerifyTwoFactorRecoveryLoginMutation,
} from './authApi';
import styles from './auth.module.scss';
import { isTotp, RECOVERY_CODE, validateLogin } from './validation';

function TwoFactorStep({ challengeToken, onBack }: { challengeToken: string; onBack: () => void }) {
  const [verifyCode, { isLoading: a }] = useVerifyTwoFactorLoginMutation();
  const [verifyRecovery, { isLoading: b }] = useVerifyTwoFactorRecoveryLoginMutation();
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = code.trim();
    if (recovery ? !RECOVERY_CODE.test(value) : !isTotp(value)) {
      setError(recovery ? 'Tiklash kodi 32 ta harf/raqamdan iborat.' : '6 xonali kodni kiriting.');
      return;
    }
    try {
      if (recovery) await verifyRecovery({ challengeToken, recoveryCode: value }).unwrap();
      else await verifyCode({ challengeToken, code: value }).unwrap();
    } catch (err) {
      setError(getErrorMessage(err, { 401: 'Kod noto‘g‘ri yoki muddati tugagan. Qaytadan kirib ko‘ring.' }));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <h1 className={styles.title}>Tasdiqlash</h1>
      <p className={styles.sub}>
        {recovery ? 'Tiklash kodlaridan birini kiriting.' : 'Authenticator ilovasidagi 6 xonali kodni kiriting.'}
      </p>
      {error && <Alert>{error}</Alert>}
      <Field label={recovery ? 'Tiklash kodi' : 'Tasdiqlash kodi'}>
        {(p) => (
          <Input
            {...p}
            value={code}
            autoFocus
            autoComplete="one-time-code"
            inputMode={recovery ? 'text' : 'numeric'}
            maxLength={recovery ? 32 : 6}
            onChange={(e) => setCode(recovery ? e.target.value.replace(/\s/g, '') : e.target.value.replace(/\D/g, ''))}
          />
        )}
      </Field>
      <Button type="submit" variant="primary" fullWidth loading={a || b}>Tasdiqlash</Button>
      <button type="button" className={styles.link} onClick={() => { setRecovery(!recovery); setCode(''); setError(null); }}>
        {recovery ? 'Authenticator kodidan foydalanish' : 'Tiklash kodi bilan kirish'}
      </button>
      <button type="button" className={styles.link} onClick={onBack}>Orqaga</button>
    </form>
  );
}

export function LoginForm() {
  const [login, { isLoading }] = useLoginMutation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateLogin>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = validateLogin(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      const res = await login({ email: values.email.trim(), password: values.password }).unwrap();
      if (res.requiresTwoFactor) setChallenge(res.challengeToken);
    } catch (err) {
      setFormError(getErrorMessage(err, { 401: 'Email yoki parol noto‘g‘ri.' }));
    }
  }

  if (challenge) return <TwoFactorStep challengeToken={challenge} onBack={() => setChallenge(null)} />;

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <h1 className={styles.title}>Kirish</h1>
      <p className={styles.sub}>Hisobingizga kiring.</p>
      {formError && <Alert>{formError}</Alert>}
      <Field label="Email" error={errors.email}>
        {(p) => <Input {...p} type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />}
      </Field>
      <Field label="Parol" error={errors.password}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />}
      </Field>
      <Button type="submit" variant="primary" fullWidth loading={isLoading}>Kirish</Button>
      <p className={styles.foot}>Hisobingiz yo‘qmi? <Link href="/register">Ro‘yxatdan o‘ting</Link></p>
    </form>
  );
}
