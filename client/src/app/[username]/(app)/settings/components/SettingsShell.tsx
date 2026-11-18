'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { useDashboardUser } from '@/contexts/dashboard-user-context';

import SettingsSidebar from './SettingsSidebar';

export default function SettingsShell({ children }: { children: ReactNode }) {
  const user = useDashboardUser();

  const displayName = user?.name?.trim() || user?.username || 'GitZone user';

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';

  return (
    <div className="w-full min-w-0 space-y-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-hover text-xl font-semibold text-primary">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${displayName} avatar`}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Account settings
          </p>

          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {displayName}
          </h1>

          {user?.username && <p className="mt-1 text-sm text-muted">@{user.username}</p>}
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <SettingsSidebar />

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
