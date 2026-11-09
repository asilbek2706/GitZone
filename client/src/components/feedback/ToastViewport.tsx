'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast, type Toast } from '@/store/slices/toastsSlice';
import styles from './Toast.module.scss';

const ICONS = { success: 'check', error: 'alert', info: 'info' } as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.kind === 'error' ? 8000 : 4500);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.kind]);

  return (
    <div className={`${styles.toast} ${styles[toast.kind]}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon}><Icon name={ICONS[toast.kind]} size={18} /></span>
      <div className={styles.body}>
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.msg}>{toast.message}</div>}
      </div>
      <button type="button" className={styles.close} aria-label="Yopish" onClick={() => dispatch(dismissToast(toast.id))}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

export function ToastViewport() {
  const items = useAppSelector((s) => s.toasts.items);
  return (
    <div className={styles.viewport} aria-live="polite" aria-label="Bildirishnomalar">
      {items.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
