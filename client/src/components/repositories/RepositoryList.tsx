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
    <div className="animate-pulse rounded-xl border border-[#30363d] bg-[#161b22] p-5">
      <div className="h-5 w-40 rounded bg-[#30363d]" />
      <div className="mt-4 h-3 w-3/4 rounded bg-[#30363d]" />
      <div className="mt-2 h-3 w-1/2 rounded bg-[#30363d]" />
      <div className="mt-6 h-3 w-32 rounded bg-[#30363d]" />
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
      <div className="space-y-3" aria-label="Loading repositories">
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
        className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center"
      >
        <h3 className="font-semibold text-red-400">Failed to load repositories</h3>

        <p className="mt-2 text-sm text-gray-400">{error}</p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm text-white transition hover:border-amber-500 hover:text-amber-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#30363d] bg-[#161b22]/50 px-5 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#21262d] text-gray-400">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5.2a1.5 1.5 0 0 1 1.06.44l1.8 1.8a1.5 1.5 0 0 0 1.06.44h3.88A1.5 1.5 0 0 1 20 8.18v10.32a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
            />
          </svg>
        </div>

        <h3 className="mt-4 font-semibold text-white">
          {hasActiveSearch ? 'No repositories found' : 'No repositories yet'}
        </h3>

        <p className="mt-2 text-sm text-gray-400">
          {hasActiveSearch
            ? 'Try changing your search or filter.'
            : 'Your repositories will appear here when you create one.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {repositories.map((repository) => (
        <RepositoryCard key={repository.id} repository={repository} />
      ))}
    </div>
  );
}
