'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiKey } from 'react-icons/fi';

export default function SettingsSidebar() {
  const pathname = usePathname();

  const isSshKeysActive = pathname === '/settings/ssh-keys';

  return (
    <aside className="min-w-0 md:sticky md:top-24 md:self-start">
      <nav
        aria-label="Settings navigation"
        className="rounded-xl border border-border bg-surface p-3"
      >
        <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Access
        </p>

        <Link
          href="/settings/ssh-keys"
          aria-current={isSshKeysActive ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            isSshKeysActive
              ? 'border border-primary/20 bg-primary/10 text-primary'
              : 'border border-transparent text-muted hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          <FiKey size={17} aria-hidden="true" />
          <span>SSH keys</span>
        </Link>
      </nav>
    </aside>
  );
}
