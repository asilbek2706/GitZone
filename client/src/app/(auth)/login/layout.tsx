import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Kirish - GitZone',
  description: 'GitZone platformasiga kirish va hisobni boshqarish.',
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
