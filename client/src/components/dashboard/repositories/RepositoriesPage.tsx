'use client';

import { useEffect, useMemo, useState } from 'react';

import RepositoryCreateCTA from '@/components/repositories/RepositoryCreateCTA';
import RepositoryFilters, {
  type RepositoryFilter,
} from '@/components/repositories/RepositoryFilters';
import RepositoryList from '@/components/repositories/RepositoryList';
import { repositoryService, type Repository } from '@/services/repository.service';

import styles from './RepositoriesPage.module.css';

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

        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while loading repositories.',
        );
      })
      .finally(() => {
        if (isActive) setLoading(false);
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
    <section className={`${styles.page} space-y-7`}>
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Your workspace
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Repositories
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Manage your projects, organize your source code, and keep everything in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-2.5">
            <span className="block text-xl font-semibold tabular-nums text-foreground">
              {repositories.length}
            </span>
            <span className="text-xs text-muted">Total repositories</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <RepositoryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
        </div>

        <RepositoryCreateCTA variant="inline" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">All projects</h2>
          <p className="mt-1 text-xs text-muted">
            {loading
              ? 'Loading your repositories...'
              : `${filteredRepositories.length} ${
                  filteredRepositories.length === 1 ? 'repository' : 'repositories'
                } found`}
          </p>
        </div>
      </div>

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
