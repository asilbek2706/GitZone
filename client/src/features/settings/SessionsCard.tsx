'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { useGetSessionsQuery, useRevokeOtherSessionsMutation, useRevokeSessionMutation } from '@/features/auth/authApi';
import styles from './settings.module.scss';

export function SessionsCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetSessionsQuery();
  const [revoke] = useRevokeSessionMutation();
  const [revokeOthers, { isLoading: revokingOthers }] = useRevokeOtherSessionsMutation();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onRevoke(id: string) {
    setBusyId(id);
    try {
      await revoke(id).unwrap();
      toast.success('Sessiya tugatildi');
    } catch (e) {
      toast.error('Xatolik', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onRevokeOthers() {
    try {
      const r = await revokeOthers().unwrap();
      toast.success('Boshqa sessiyalar tugatildi', `${r.revokedSessions} ta sessiya`);
    } catch (e) {
      toast.error('Xatolik', getErrorMessage(e));
    }
  }

  return (
    <Card>
      <div className={styles.head}>
        <h2 className="h">Faol sessiyalar</h2>
        <p>Hisobingizga kirgan qurilmalar. Tanimagan sessiyani darhol tugating.</p>
      </div>
      {isLoading ? <Skeleton height={48} /> : error ? (
        <div className={styles.form}>
          <Alert>{getErrorMessage(error)}</Alert>
          <Button onClick={() => refetch()}>Qayta urinish</Button>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {data?.map((s) => (
              <li key={s.id} className={styles.item}>
                <span className={styles.meta}>
                  <b className={styles.ua}>{s.userAgent ?? 'Noma’lum qurilma'}</b>
                  <span className={styles.muted}>{s.ipAddress ?? 'IP noma’lum'} · oxirgi faollik: {formatDate(s.lastUsedAt)}</span>
                </span>
                <Button variant="danger" loading={busyId === s.id} onClick={() => onRevoke(s.id)}>Tugatish</Button>
              </li>
            ))}
            {data?.length === 0 && <li className={styles.item}><span className={styles.muted}>Faol sessiya yo‘q.</span></li>}
          </ul>
          {(data?.length ?? 0) > 1 && (
            <Button loading={revokingOthers} onClick={onRevokeOthers}>Boshqa barcha sessiyalarni tugatish</Button>
          )}
        </>
      )}
    </Card>
  );
}
