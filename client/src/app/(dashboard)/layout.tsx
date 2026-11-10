'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

import ProtectedRoute from '@/components/ProtectedRoute';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import RepositoryCreateCTA from '@/components/repositories/RepositoryCreateCTA';
import ThemeSwitcher from '@/components/ThemeSwitcher';

import { authService } from '@/services/auth.service';
import type { AuthUser } from '@/types/api';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const isOverviewActive = pathname === '/dashboard';
  const isRepositoriesActive = pathname.startsWith('/dashboard/repositories');

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setCurrentYear(new Date().getFullYear());

      const token = localStorage.getItem('accessToken');

      if (!token) {
        if (isMounted) {
          setIsLoadingUser(false);
        }
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        const currentUser = response.data.data.user;

        if (!currentUser) {
          throw new Error('Foydalanuvchi maʼlumotlari topilmadi.');
        }

        if (!isMounted) return;

        setUser(currentUser);
      } catch (error) {
        console.error('Dashboard foydalanuvchisini yuklashda xato:', error);

        const status = (error as { response?: { status?: number } }).response?.status;

        if (status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
            <Link
              href="/dashboard"
              className="group flex min-w-0 items-center gap-2.5"
              aria-label="GitZone dashboard"
            >
              <Image
                src="/brand/gitzone-mark.svg"
                alt="GitZone"
                width={32}
                height={32}
                priority
                className="shrink-0"
              />

              <span className="hidden truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:inline-block">
                {user?.username || 'GitZone'}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted md:inline-flex">
                v1.0.0
              </span>

              <ThemeSwitcher />

              <div className="hidden h-7 w-px bg-border sm:block" />

              <RepositoryCreateCTA variant="header" />

              <div className="hidden h-7 w-px bg-border sm:block" />

              {isLoadingUser ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-surface-hover" />
              ) : (
                <UserProfileDropdown user={user} />
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-8">
          <nav
            aria-label="Dashboard navigation"
            className="mb-7 flex gap-6 overflow-x-auto border-b border-border text-sm font-medium"
          >
            <Link
              href="/dashboard"
              aria-current={isOverviewActive ? 'page' : undefined}
              className={`-mb-px flex shrink-0 items-center border-b-2 px-1 pb-3 transition-colors ${
                isOverviewActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
              }`}
            >
              Overview
            </Link>

            <Link
              href="/dashboard/repositories"
              aria-current={isRepositoriesActive ? 'page' : undefined}
              className={`-mb-px flex shrink-0 items-center border-b-2 px-1 pb-3 transition-colors ${
                isRepositoriesActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
              }`}
            >
              Repositories
            </Link>
          </nav>

          {children}
        </main>

        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
          © {currentYear ?? new Date().getFullYear()} GitZone. Built for developers.
        </footer>
      </div>
    </ProtectedRoute>
  );
}
