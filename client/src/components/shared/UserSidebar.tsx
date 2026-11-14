import Image from 'next/image';
import Link from 'next/link';

import type { AuthUser } from '@/types/api';

interface UserSidebarProps {
  user: AuthUser | null;
}

export default function UserSidebar({ user }: UserSidebarProps) {
  if (!user) return null;

  const displayName = user.name?.trim() || user.username;

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';

  return (
    <aside className="min-w-0">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24 lg:p-5">
        <div className="flex items-center gap-4 lg:flex-col lg:items-stretch">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-hover lg:h-56 lg:w-full lg:rounded-2xl">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={`${displayName} avatar`}
                fill
                sizes="(max-width: 1024px) 64px, 260px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#292f38] to-[#11151b] text-3xl font-bold text-primary lg:text-6xl">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{displayName}</h2>

            <p className="truncate text-sm text-muted">@{user.username}</p>
          </div>
        </div>

        {user.bio && <p className="mt-4 text-sm leading-relaxed text-muted">{user.bio}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-medium text-foreground transition hover:bg-surface-hover"
          >
            My Profile
          </Link>

          <Link
            href="/dashboard/repositories"
            className="rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-medium text-foreground transition hover:bg-surface-hover"
          >
            Repositories
          </Link>
        </div>
      </section>
    </aside>
  );
}
