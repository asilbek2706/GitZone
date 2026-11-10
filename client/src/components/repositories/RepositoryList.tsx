import type { Repository } from '@/services/repository.service';
import RepositoryCard from './RepositoryCard';

interface RepositoryListProps {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasActiveSearch: boolean;
}

function RepositorySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-40 rounded-md bg-surface-muted" />
        <div className="h-6 w-16 rounded-full bg-surface-muted" />
      </div>
      <div className="mt-4 h-3 w-3/4 rounded bg-surface-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-surface-muted" />
      <div className="mt-6 h-3 w-32 rounded bg-surface-muted" />
    </div>
  );
}

export default function RepositoryList({
  repositories,
  loading,
  error,
  onRetry,
  hasActiveSearch,
}: RepositoryListProps) {
  if (loading) {
    return (
      <div className="grid gap-3" aria-label="Loading repositories" aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <RepositorySkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/25 bg-danger/5 px-5 py-12 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18.5A2 2 0 0 0 3.55 21h16.9a2 2 0 0 0 1.73-2.5L13.7 3.86a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <h3 className="mt-4 font-semibold text-foreground">Failed to load repositories</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{error}</p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-muted text-muted">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5.2a1.5 1.5 0 0 1 1.06.44l1.8 1.8a1.5 1.5 0 0 0 1.06.44h3.88A1.5 1.5 0 0 1 20 8.18v10.32a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
            />
          </svg>
        </div>

        <h3 className="mt-5 text-base font-semibold text-foreground">
          {hasActiveSearch ? 'No repositories found' : 'No repositories yet'}
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          {hasActiveSearch
            ? 'Try changing your search query or selecting another filter.'
            : 'Your repositories will appear here when you create your first project.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {repositories.map((repository) => (
        <RepositoryCard key={repository.id} repository={repository} />
      ))}
    </div>
  );
}
