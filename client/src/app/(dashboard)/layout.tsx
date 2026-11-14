'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

import UserProfileDropdown from '@/components/UserProfileDropdown';
import UserSidebar from '@/components/shared/UserSidebar';
import RepositoryCreateCTA from '@/components/repositories/RepositoryCreateCTA';
import ThemeSwitcher from '@/components/ThemeSwitcher';

import { AUTH_EXPIRED_EVENT } from '@/lib/api';
import { authService } from '@/services/auth.service';
import type { AuthUser } from '@/types/api';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const isOverviewActive = pathname === '/dashboard';
  const isRepositoriesActive = pathname.startsWith('/dashboard/repositories');

  const isRepositoryDetail = /^\/dashboard\/repositories\/[^/]+\/[^/]+(?:\/|$)/.test(pathname);

  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleAuthenticationExpired = () => {
      if (!isMounted) return;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingUser(true);

      router.replace('/login');
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthenticationExpired);

    const loadDashboardData = async () => {
      try {
        const response = await authService.getCurrentUser();
        const currentUser = response.data.data.user;

        if (!currentUser) {
          throw new Error('Foydalanuvchi maʼlumotlari topilmadi.');
        }

        if (!isMounted) return;

        setUser(currentUser);
        setIsAuthenticated(true);

        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (error) {
        if (!isMounted) return;

        console.error('Dashboard foydalanuvchisini yuklashda xato:', error);

        const status = (error as { response?: { status?: number } }).response?.status;

        if (status === 401 || status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');

          router.replace('/login');
          return;
        }

        setAuthError(
          'GitZone serveriga ulanishda muammo yuz berdi. Backend ishlayotganini tekshirib, qayta urinib ko‘ring.',
        );
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;

      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthenticationExpired);
    };
  }, [router]);

  if (isLoadingUser) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background text-foreground"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted">Session tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
          <p className="text-sm text-muted">
            {authError ?? 'Login sahifasiga yo‘naltirilmoqda...'}
          </p>

          {authError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Qayta urinish
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
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
              {pathname === '/new' ? 'New Repository' : user?.username || 'GitZone'}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted md:inline-flex">
              Beta
            </span>

            <ThemeSwitcher />

            <div className="hidden h-7 w-px bg-border sm:block" />

            <RepositoryCreateCTA variant="header" />

            <div className="hidden h-7 w-px bg-border sm:block" />

            <UserProfileDropdown user={user} />
          </div>
        </div>
      </header>

      <div
        className={`mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:gap-8 lg:px-8 ${
          isRepositoryDetail ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        {!isRepositoryDetail && <UserSidebar user={user} />}

        <main className="min-w-0 py-2">
          {pathname !== '/new' && !isRepositoryDetail && (
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
          )}

          {children}
        </main>
      </div>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
        © {currentYear ?? new Date().getFullYear()} GitZone. Built for developers.
      </footer>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
