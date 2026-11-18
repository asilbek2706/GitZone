import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import SettingsShell from './components/SettingsShell';

export const metadata: Metadata = {
  title: {
    default: 'Settings',
    template: '%s | GitZone',
  },
  description: 'Manage your GitZone account and security settings.',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
