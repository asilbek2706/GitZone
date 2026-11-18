import OverviewPage from '@/components/dashboard/OverviewPage';
import RepositoriesPage from '@/components/dashboard/repositories/RepositoriesPage';

interface UserDashboardPageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    tab?: string | string[];
  }>;
}

export default async function UserDashboardPage({
  searchParams,
}: UserDashboardPageProps) {
  const query = await searchParams;

  const activeTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;

  if (activeTab === 'repositories') {
    return <RepositoriesPage />;
  }

  return <OverviewPage />;
}
