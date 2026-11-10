'use client';
import styles from './RepositoriesPage.module.css';

import { useEffect, useMemo, useState } from 'react';

import { repositoryService, type Repository } from '@/services/repository.service';

import RepositoryFilters, {
  type RepositoryFilter,
} from '@/components/repositories/RepositoryFilters';

import RepositoryList from '@/components/repositories/RepositoryList';

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RepositoryFilter>('all');

  useEffect(() => {
    let isActive = true;

    repositoryService
      .getMyRepositories()
      .then((response) => {
        if (!isActive) return;

        if (!response.success || !response.data?.repositories) {
          throw new Error('Invalid repository response.');
        }

        setRepositories(response.data.repositories);
      })
      .catch((err: unknown) => {
        if (!isActive) return;

        console.error('Repositorylarni yuklashda xatolik:', err);

        const message =
          err instanceof Error ? err.message : 'Something went wrong while loading repositories.';

        setError(message);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: repositories.length,
      public: repositories.filter((repository) => !repository.isPrivate).length,
      private: repositories.filter((repository) => repository.isPrivate).length,
    }),
    [repositories],
  );

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return repositories.filter((repository) => {
      const matchesSearch =
        !normalizedQuery ||
        repository.name.toLowerCase().includes(normalizedQuery) ||
        (repository.description ?? '').toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'public' && !repository.isPrivate) ||
        (activeFilter === 'private' && repository.isPrivate);

      return matchesSearch && matchesFilter;
    });
  }, [repositories, searchQuery, activeFilter]);

  return (
    <section className={`${styles.page} space-y-6`}>
      <header className="flex flex-col gap-2 border-b border-[#30363d] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Repositories</h1>
            <p className="mt-1 text-sm text-gray-400">
              Manage your personal projects and source code.
            </p>
          </div>

          <span className="rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs text-gray-300">
            {repositories.length} repositories
          </span>
        </div>
      </header>

      <RepositoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      <RepositoryList
        repositories={filteredRepositories}
        loading={loading}
        error={error}
        onRetry={() => window.location.reload()}
        hasActiveSearch={Boolean(searchQuery.trim()) || activeFilter !== 'all'}
      />
    </section>
  );
}
