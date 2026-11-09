'use client';

import { useState, type FormEvent } from 'react';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage, hasStatus } from '@/lib/api/errors';
import { copyText } from '@/lib/clipboard';
import {
  useDisableTwoFactorMutation, useSetupTwoFactorMutation, useVerifyTwoFactorSetupMutation,
} from '@/features/auth/authApi';
import type { TwoFactorSetup } from '@/features/auth/types';
import { isTotp } from '@/features/auth/validation';
import { RecoveryCodes } from './RecoveryCodes';
import styles from './settings.module.scss';

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

export function TwoFactorCard() {
  const toast = useToast();
  const [startSetup, { isLoading: starting }] = useSetupTwoFactorMutation();
  const [verifySetup, { isLoading: verifying }] = useVerifyTwoFactorSetupMutation();
  const [disable, { isLoading: disabling }] = useDisableTwoFactorMutation();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [showDisable, setShowDisable] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setError(null);
    try {
      setSetup(await startSetup().unwrap());
      setShowDisable(false);
    } catch (e) {
      if (hasStatus(e, 409)) { setShowDisable(true); setError('2FA allaqachon yoqilgan. O‘chirish uchun parol va kodni kiriting.'); }
      else setError(getErrorMessage(e));
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isTotp(code)) return setError('6 xonali kodni kiriting.');
    try {
      const r = await verifySetup({ code }).unwrap();
      setCodes(r.recoveryCodes);
      setSetup(null);
      setCode('');
    } catch (err) {
      setError(getErrorMessage(err, { 401: 'Kod noto‘g‘ri. Ilovadagi yangi kodni kiriting.' }));
    }
  }

  async function onDisable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) return setError('Parolni kiriting.');
    if (!isTotp(code)) return setError('6 xonali kodni kiriting.');
    try {
      await disable({ password, code }).unwrap();
      toast.success('2FA o‘chirildi');
      setShowDisable(false);
      setPassword('');
      setCode('');
    } catch (err) {
      setError(getErrorMessage(err, { 401: 'Parol yoki kod noto‘g‘ri.', 409: '2FA yoqilmagan.' }));
    }
  }

  return (
    <Card>
      <div className={styles.head}>
        <h2 className="h">Ikki bosqichli tasdiqlash (2FA)</h2>
        <p>Kirishda parolga qo‘shimcha authenticator ilovasidagi kod so‘raladi.</p>
      </div>

      {codes ? (
        <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />
      ) : (
        <div className={styles.form} style={{ maxWidth: 480 }}>
          {error && <Alert>{error}</Alert>}

          {setup && (
            <form onSubmit={onVerify} noValidate className={styles.form}>
              <p>1. Authenticator ilovasi (Google Authenticator, Authy va hokazo) bilan QR kodni skanerlang:</p>
              {/* data: URL, next/image kerak emas */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.qr} src={setup.qrCodeDataUrl} alt="2FA QR kodi" width={200} height={200} />
              <p className={styles.muted}>QR ishlamasa, kalitni qo‘lda kiriting:</p>
              <div className={styles.row}>
                <code className={styles.secret}>{setup.secret}</code>
                <Button onClick={async () => toast[(await copyText(setup.secret)) ? 'success' : 'error']('Kalit nusxalandi')}>Nusxalash</Button>
              </div>
              <p>2. Ilovadagi 6 xonali kodni kiriting:</p>
              <Field label="Tasdiqlash kodi">
                {(p) => <Input {...p} value={code} onChange={(e) => setCode(digits(e.target.value))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />}
              </Field>
              <div className={styles.row}>
                <Button type="submit" variant="primary" loading={verifying}>Tasdiqlash va yoqish</Button>
                <Button variant="ghost" onClick={() => { setSetup(null); setCode(''); setError(null); }}>Bekor qilish</Button>
              </div>
            </form>
          )}

          {showDisable && !setup && (
            <form onSubmit={onDisable} noValidate className={styles.form}>
              <Field label="Joriy parol">{(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
              <Field label="Authenticator kodi">
                {(p) => <Input {...p} value={code} onChange={(e) => setCode(digits(e.target.value))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />}
              </Field>
              <div className={styles.row}>
                <Button type="submit" variant="danger" loading={disabling}>2FA ni o‘chirish</Button>
                <Button variant="ghost" onClick={() => { setShowDisable(false); setError(null); }}>Bekor qilish</Button>
              </div>
            </form>
          )}

          {!setup && !showDisable && (
            <div className={styles.row}>
              <Button variant="primary" loading={starting} onClick={onStart}>2FA ni sozlash</Button>
              <Button onClick={() => { setShowDisable(true); setError(null); }}>2FA ni o‘chirish</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
