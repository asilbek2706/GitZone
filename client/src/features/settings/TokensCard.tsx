'use client';

import { useState, type FormEvent } from 'react';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/api/errors';
import { copyText } from '@/lib/clipboard';
import { formatDate } from '@/lib/format';
import { useCreateTokenMutation, useListTokensQuery, useRevokeTokenMutation } from '@/features/auth/authApi';
import type { CreatedToken } from '@/features/auth/types';
import styles from './settings.module.scss';

export function TokensCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useListTokensQuery();
  const [create, { isLoading: creating }] = useCreateTokenMutation();
  const [revoke] = useRevokeTokenMutation();
  const [name, setName] = useState('');
  const [expires, setExpires] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = name.trim();
    if (!n || n.length > 100) return setFormError('Token nomi 1–100 belgi bo‘lishi kerak.');
    let expiresAt: string | undefined;
    if (expires) {
      const d = new Date(expires);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return setFormError('Amal qilish muddati kelajakda bo‘lishi kerak.');
      expiresAt = d.toISOString();
    }
    try {
      setCreated(await create({ name: n, expiresAt }).unwrap());
      setName('');
      setExpires('');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function onRevoke(id: string) {
    setBusyId(id);
    try {
      await revoke(id).unwrap();
      toast.success('Token o‘chirildi');
    } catch (err) {
      toast.error('Xatolik', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <div className={styles.head}>
        <h2 className="h">Personal access tokenlar</h2>
        <p>Git (HTTP) va API uchun. Tokenni parol o‘rnida ishlatasiz. To‘liq token faqat bir marta ko‘rsatiladi.</p>
      </div>

      {created && (
        <Alert tone="warning">
          <b>“{created.name}” tokeni yaratildi. Hozir nusxalab oling, keyin qayta ko‘rsatilmaydi.</b>
          <div className={styles.token}>{created.token}</div>
          <div className={styles.row}>
            <Button onClick={async () => toast[(await copyText(created.token)) ? 'success' : 'error']((await Promise.resolve(true)) ? 'Nusxa olish natijasi' : '')}>
              Nusxalash
            </Button>
            <Button variant="ghost" onClick={() => setCreated(null)}>Saqlab oldim, yopish</Button>
          </div>
        </Alert>
      )}

      {isLoading ? <Skeleton height={48} /> : error ? (
        <div className={styles.form}><Alert>{getErrorMessage(error)}</Alert><Button onClick={() => refetch()}>Qayta urinish</Button></div>
      ) : (
        <ul className={styles.list}>
          {data?.map((t) => (
            <li key={t.id} className={styles.item}>
              <span className={styles.meta}>
                <b>{t.name} <span className="mono m">{t.tokenPrefix}…</span></b>
                <span className={styles.muted}>
                  Muddati: {t.expiresAt ? formatDate(t.expiresAt) : 'cheksiz'} · oxirgi ishlatilgan: {formatDate(t.lastUsedAt)}
                </span>
              </span>
              <Button variant="danger" loading={busyId === t.id} onClick={() => onRevoke(t.id)}>O‘chirish</Button>
            </li>
          ))}
          {data?.length === 0 && <li className={styles.item}><span className={styles.muted}>Hali token yo‘q.</span></li>}
        </ul>
      )}

      <form onSubmit={onCreate} noValidate className={styles.form} style={{ marginTop: 16 }}>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Token nomi">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />}</Field>
        <Field label="Amal qilish muddati (ixtiyoriy)" hint="Bo‘sh qoldirsangiz, token muddatsiz bo‘ladi.">
          {(p) => <Input {...p} type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />}
        </Field>
        <Button type="submit" variant="primary" loading={creating} style={{ justifySelf: 'start' }}>Yangi token yaratish</Button>
      </form>
    </Card>
  );
}
