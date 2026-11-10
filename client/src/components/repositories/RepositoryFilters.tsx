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
    <div className="space-y-4">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeWidth="1.8" d="m16 16 4 4" />
        </svg>

        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Find a repository..."
          aria-label="Search repositories"
          className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-[#30363d] bg-[#161b22] text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {filter.label}

              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-[#30363d] text-gray-400'
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
