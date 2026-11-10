import Link from 'next/link';
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

  
  const ownerUsername = repository.owner?.username;
  const repositoryHref = ownerUsername
    ? `/dashboard/repositories/${encodeURIComponent(ownerUsername)}/${encodeURIComponent(repository.name)}`
    : '/dashboard/repositories';return (
    <Link href={repositoryHref} className="block"><article className="group rounded-2xl border border-border bg-surface p-5 transition duration-200 hover:border-primary/30 hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition group-hover:border-primary/20 group-hover:text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5.2a1.5 1.5 0 0 1 1.06.44l1.8 1.8a1.5 1.5 0 0 0 1.06.44h3.88A1.5 1.5 0 0 1 20 8.18v10.32a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="break-all text-base font-semibold text-primary transition group-hover:underline group-hover:underline-offset-4">
                {repository.name}
              </h3>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  repository.isPrivate
                    ? 'border-warning/25 bg-warning/10 text-warning'
                    : 'border-success/25 bg-success/10 text-success'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {repository.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-muted">
              {repository.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <span className="font-medium text-text-secondary">{repository.defaultBranch}</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeWidth="1.8" d="M12 7v5l3 2" />
          </svg>
          Updated on {formattedDate}
        </span>
      </div>
    </article></Link>
  );
}

