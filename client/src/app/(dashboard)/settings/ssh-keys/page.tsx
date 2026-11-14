import type { Metadata } from 'next';

import SshKeysPage from './SshKeysPage';

export const metadata: Metadata = {
  title: 'SSH keys',
  description: 'Add, review, and manage the SSH public keys connected to your GitZone account.',
};

export default function SshKeysRoute() {
  return <SshKeysPage />;
}
