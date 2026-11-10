import type { Repository } from '@/services/repository.service';

interface RepositoryCardProps {
  repository: Repository;
}

export default function RepositoryCard({ repository }: RepositoryCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(repository.updatedAt));

  return (
    <article className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 transition hover:border-amber-500/50 hover:bg-[#1c2128]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-all text-base font-semibold text-blue-400">{repository.name}</h3>

            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                repository.isPrivate
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {repository.isPrivate ? 'Private' : 'Public'}
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {repository.description || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#30363d]/70 pt-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"
            />
          </svg>
          {repository.defaultBranch}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeWidth="1.8" d="M12 7v5l3 2" />
          </svg>
          Updated on {formattedDate}
        </span>
      </div>
    </article>
  );
}
