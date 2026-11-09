import type { ReactNode } from 'react';
import { TigerLogo } from '@/components/brand/TigerLogo';
import { GuestGate } from '@/features/auth/GuestGate';
import styles from './auth-layout.module.scss';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGate>
      <div className={styles.wrap}>
        <aside className={styles.brand}>
          <TigerLogo size={220} />
          <h2>Git<span>Zone</span></h2>
          <p>Kodingiz uchun o‘z hududingiz.</p>
        </aside>
        <main id="main" tabIndex={-1} className={styles.main}>
          <div className={styles.card}>{children}</div>
        </main>
      </div>
    </GuestGate>
  );
}
