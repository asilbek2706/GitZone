import type { Metadata } from 'next';
import { UiShowcase } from '@/features/ui-kit/UiShowcase';

export const metadata: Metadata = { title: 'Komponentlar' };

export default function UiPage() {
  return <UiShowcase />;
}
