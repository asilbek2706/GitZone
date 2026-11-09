import type { ReactNode } from 'react';
import styles from './Alert.module.scss';

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`${styles.alert} ${styles[tone]}`}>
      {children}
    </div>
  );
}
