'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageLoader } from '@/components/ui/Spinner';
import { useAppSelector } from '@/store/hooks';
import { safeNext } from './validation';

/** Login/register: allaqachon kirgan foydalanuvchi panelga yo'naltiriladi. */
export function GuestGate({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace(safeNext(new URLSearchParams(window.location.search).get('next')));
  }, [status, router]);

  if (status === 'unknown' || status === 'authenticated') return <PageLoader label="Yuklanmoqda…" />;
  return <>{children}</>;
}
