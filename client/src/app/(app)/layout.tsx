import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/features/auth/AuthGate';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
