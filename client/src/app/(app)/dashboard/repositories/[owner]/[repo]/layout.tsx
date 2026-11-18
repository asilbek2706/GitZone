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

const navigation = [
  { label: 'Overview', segment: '', icon: BookOpen },
  { label: 'Code', segment: '/code', icon: Code2 },
  { label: 'Branches', segment: '/branches', icon: GitBranch },
  { label: 'Commits', segment: '/commits', icon: GitCommitHorizontal },
  { label: 'Pull requests', segment: '/pulls', icon: GitPullRequest },
  { label: 'Issues', segment: '/issues', icon: CircleDot },
  { label: 'Settings', segment: '/settings', icon: Settings },
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
