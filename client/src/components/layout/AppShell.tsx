'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TigerLogo } from '@/components/brand/TigerLogo';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import styles from './AppShell.module.scss';
import { UserMenu } from './UserMenu';

// Yangi bo'limlar (repozitoriylar, issues, ...) keyingi fazalarda shu ro'yxatga qo'shiladi.
const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Bosh panel', icon: 'home' },
  { href: '/settings/security', label: 'Xavfsizlik', icon: 'shield' },
  { href: '/ui', label: 'Komponentlar', icon: 'repo' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <Link href="/" aria-label="GitZone bosh sahifa"><TigerLogo size={40} decorative /></Link>
        <nav className={styles.nav} aria-label="Asosiy navigatsiya">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.link}
              title={item.label}
              aria-label={item.label}
              aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.main}>
        <header className={styles.top}>
          <Button variant="ghost" onClick={toggle} aria-label={theme === 'dark' ? 'Yorug‘ mavzuga o‘tish' : 'Qorong‘i mavzuga o‘tish'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </Button>
          <UserMenu />
        </header>
        <main id="main" tabIndex={-1} className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
