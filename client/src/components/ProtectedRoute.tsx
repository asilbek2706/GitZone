'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_EXPIRED_EVENT } from '@/lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleAuthenticationExpired = () => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);
      router.replace('/login');
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthenticationExpired);

    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.replace('/login');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
    }

    return () => {
      isMounted = false;

      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthenticationExpired);
    };
  }, [router]);

  if (isLoading) {
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

  return <>{children}</>;
}
