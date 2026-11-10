import type { Metadata } from 'next';

import ProtectedRoute from '@/components/ProtectedRoute';
import RepositoryCreateForm from '@/components/repositories/create/RepositoryCreateForm';

export const metadata: Metadata = {
  title: 'Create a New Repository | GitZone',
  description: 'Create a new GitZone repository.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewRepositoryPage() {
  return (
    <ProtectedRoute>
      <RepositoryCreateForm />
    </ProtectedRoute>
  );
}
