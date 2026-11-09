'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/api/errors';
import { useRegisterMutation } from './authApi';
import styles from './auth.module.scss';
import { validateRegister } from './validation';

const EMPTY = { username: '', email: '', name: '', password: '', confirm: '' };

export function RegisterForm() {
  const [register, { isLoading }] = useRegisterMutation();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validateRegister>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setValues({ ...values, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = validateRegister(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      await register({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim() || undefined,
      }).unwrap();
    } catch (err) {
      setFormError(getErrorMessage(err, { 409: 'Bu username yoki email allaqachon band.' }));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <h1 className={styles.title}>Ro‘yxatdan o‘tish</h1>
      <p className={styles.sub}>Yangi GitZone hisobini yarating.</p>
      {formError && <Alert>{formError}</Alert>}
      <Field label="Username" hint="3–30 belgi: harf, raqam, _ va -" error={errors.username}>
        {(p) => <Input {...p} autoComplete="username" value={values.username} onChange={set('username')} />}
      </Field>
      <Field label="Email" error={errors.email}>
        {(p) => <Input {...p} type="email" autoComplete="email" value={values.email} onChange={set('email')} />}
      </Field>
      <Field label="Ism (ixtiyoriy)" error={errors.name}>
        {(p) => <Input {...p} autoComplete="name" value={values.name} onChange={set('name')} />}
      </Field>
      <Field label="Parol" hint="Kamida 8 belgi" error={errors.password}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />}
      </Field>
      <Field label="Parolni tasdiqlang" error={errors.confirm}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} />}
      </Field>
      <Button type="submit" variant="primary" fullWidth loading={isLoading}>Hisob yaratish</Button>
      <p className={styles.foot}>Hisobingiz bormi? <Link href="/login">Kirish</Link></p>
    </form>
  );
}
