import type { Metadata } from 'next';
import { DashboardView } from '@/features/dashboard/DashboardView';

export const metadata: Metadata = { title: 'Bosh panel' };

export default function DashboardPage() {
  return <DashboardView />;
}
