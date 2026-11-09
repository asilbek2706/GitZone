import type { Metadata } from 'next';
import { SecuritySettings } from '@/features/settings/SecuritySettings';

export const metadata: Metadata = { title: 'Xavfsizlik' };

export default function SecurityPage() {
  return <SecuritySettings />;
}
