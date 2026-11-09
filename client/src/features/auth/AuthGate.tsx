'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageLoader } from '@/components/ui/Spinner';
import { useAppSelector } from '@/store/hooks';

/** Himoyalangan sahifalar: kirmagan foydalanuvchi /login ga yo'naltiriladi. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== 'authenticated') return <PageLoader label="Tekshirilmoqda…" />;
  return <>{children}</>;
}
