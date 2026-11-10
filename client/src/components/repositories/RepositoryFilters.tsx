export type RepositoryFilter = 'all' | 'public' | 'private';

interface RepositoryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: RepositoryFilter;
  onFilterChange: (filter: RepositoryFilter) => void;
  counts: {
    all: number;
    public: number;
    private: number;
  };
}

export default function RepositoryFilters({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
}: RepositoryFiltersProps) {
  const filters: { label: string; value: RepositoryFilter; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Public', value: 'public', count: counts.public },
    { label: 'Private', value: 'private', count: counts.private },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeWidth="1.8" d="m16 16 4 4" />
        </svg>

        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search repositories..."
          aria-label="Search repositories"
          className="h-11 w-full rounded-xl border border-border bg-background px-4 pl-10 text-sm text-foreground outline-none transition placeholder:text-muted/70 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Repository visibility filters">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={isActive}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition ${
                isActive
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              {filter.label}

              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-muted text-muted'
                }`}
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
