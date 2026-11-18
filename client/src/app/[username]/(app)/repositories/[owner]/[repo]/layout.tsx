'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BookOpen,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  CircleDot,
  Settings,
  Code2,
} from 'lucide-react';

interface NavigationItem {
  label: string;
  segment: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  meta?: {
    title: string;
  };
}

const navigation = [
  { label: 'Overview', segment: '', icon: BookOpen, meta: { title: 'Repository Overview' } },
  { label: 'Code', segment: '/code', icon: Code2, meta: { title: 'Repository Code' } },
  {
    label: 'Branches',
    segment: '/branches',
    icon: GitBranch,
    meta: { title: 'Repository Branches' },
  },
  {
    label: 'Commits',
    segment: '/commits',
    icon: GitCommitHorizontal,
    meta: { title: 'Repository Commits' },
  },
  {
    label: 'Pull requests',
    segment: '/pulls',
    icon: GitPullRequest,
    meta: { title: 'Repository Pull Requests' },
  },
  { label: 'Issues', segment: '/issues', icon: CircleDot, meta: { title: 'Repository Issues' } },
  {
    label: 'Settings',
    segment: '/settings',
    icon: Settings,
    meta: { title: 'Repository Settings' },
  },
];

export default function RepositoryDetailLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ owner: string; repo: string }>();
  const pathname = usePathname();

  const repositoryPath = `/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}`;

  return (
    <div className="min-w-0">
      <div className="mb-7 border-b border-border">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <span className="text-muted">{params.owner}</span>
            <span className="mx-2 text-muted">/</span>
            <span className="font-semibold text-foreground break-all">{params.repo}</span>
          </div>

          <Link
            href="/dashboard/repositories"
            className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            All repositories
          </Link>
        </div>

        <nav
          aria-label="Repository navigation"
          className="flex gap-6 overflow-x-auto text-sm font-medium"
        >
          {navigation.map(({ label, segment, icon: Icon }) => {
            const href = `${repositoryPath}${segment}`;

            const isActive =
              segment === ''
                ? pathname === repositoryPath || pathname === `${repositoryPath}/`
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={label}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 transition-colors ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
