'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

import ProtectedRoute from '@/components/ProtectedRoute';
import UserProfileDropdown from '@/components/UserProfileDropdown';
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
        if (isMounted) setIsLoadingUser(false);
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
      <div className="flex min-h-screen flex-col bg-[#0d1117] text-white selection:bg-amber-500 selection:text-neutral-950">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-neutral-950 shadow-lg">
                <Image src="/brand/gitzone-mark.svg" alt="GitZone Mark" width={32} height={32} />
              </div>

              <span className="hidden text-md text-white transition group-hover:text-amber-500 sm:inline-block">
                {user?.username || 'GitZone'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden rounded-md border border-[#30363d] bg-[#21262d] px-2.5 py-1 font-mono text-xs text-gray-300 sm:inline-block">
              v1.0.0-cyber
            </span>

            {isLoadingUser ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-[#30363d]" />
            ) : (
              <UserProfileDropdown user={user} />
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-8">
          {/* Dashboard navigation */}
          <nav
            aria-label="Dashboard navigation"
            className="mb-6 flex gap-6 overflow-x-auto border-b border-[#30363d] text-sm font-medium"
          >
            <Link
              href="/dashboard"
              aria-current={isOverviewActive ? 'page' : undefined}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 transition ${
                isOverviewActive
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-gray-400 hover:border-[#8b949e] hover:text-white'
              }`}
            >
              Overview
            </Link>

            <Link
              href="/dashboard/repositories"
              aria-current={isRepositoriesActive ? 'page' : undefined}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 transition ${
                isRepositoriesActive
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-gray-400 hover:border-[#8b949e] hover:text-white'
              }`}
            >
              Repositories
            </Link>
          </nav>

          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#30363d] px-8 py-6 text-center text-xs text-gray-500">
          &copy; {currentYear ?? ''} GitZone Inc. Cyberpunk Open Source Platform.
        </footer>
      </div>
    </ProtectedRoute>
  );
}
