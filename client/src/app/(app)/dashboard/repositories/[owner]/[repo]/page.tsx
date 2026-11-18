'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  GitBranch,
  LockKeyhole,
  Globe2,
  CalendarDays,
  Clock3,
  FolderGit2,
  AlertCircle,
  Star,
  Copy,
  Check,
  Code2,
  Settings,
  ExternalLink,
} from 'lucide-react';

import {
  repositoryService,
  type Repository,
} from '@/services/repository.service';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function RepositoryOverviewPage() {
  const params = useParams<{ owner: string; repo: string }>();

  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadRepository = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await repositoryService.getRepository(
          params.owner,
          params.repo,
        );

        if (!response.success || !response.data?.repository) {
          throw new Error('Repository maʼlumotlarini olish imkonsiz.');
        }

        if (active) {
          setRepository(response.data.repository);
        }
      } catch (err) {
        if (!active) return;

        const apiError = err as {
          response?: {
            data?: { message?: string };
            status?: number;
          };
          message?: string;
        };

        setError(
          apiError.response?.data?.message ||
            (apiError.response?.status === 404
              ? 'Repository topilmadi yoki unga kirish imkoniyati yo‘q.'
              : apiError.message ||
                'Repository maʼlumotlarini yuklashda xatolik yuz berdi.'),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRepository();

    return () => {
      active = false;
    };
  }, [params.owner, params.repo]);

  const owner = repository?.owner?.username || params.owner;

  const cloneUrl = repository
    ? `${API_BASE_URL}/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}.git`
    : '';

  const handleCopyCloneUrl = async () => {
    if (!cloneUrl) return;

    setCopyError(null);

    try {
      await navigator.clipboard.writeText(cloneUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(
        'Clipboard ishlamadi. URL ustiga bosib, uni qo‘lda nusxalang.',
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading repository">
        <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="h-7 w-56 animate-pulse rounded bg-surface-muted" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/25 bg-danger/5 px-6 py-12 text-center"
      >
        <AlertCircle className="mx-auto h-8 w-8 text-danger" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Repository yuklanmadi
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {error || 'Repository maʼlumotlari topilmadi.'}
        </p>
        <Link
          href="/dashboard/repositories"
          className="mt-5 inline-flex items-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Repositories sahifasiga qaytish
        </Link>
      </div>
    );
  }

  const createdDate = formatDate(repository.createdAt);
  const updatedDate = formatDate(repository.updatedAt);

  return (
    <div className="min-w-0 space-y-6">
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={`/dashboard/users/${encodeURIComponent(owner)}`}
                className="font-medium text-primary transition hover:underline"
              >
                {owner}
              </Link>
              <span className="text-muted">/</span>
              <span className="break-all font-semibold text-foreground">
                {repository.name}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
                {repository.isPrivate ? (
                  <LockKeyhole size={11} />
                ) : (
                  <Globe2 size={11} />
                )}
                {repository.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted">
                <FolderGit2 size={21} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="break-all text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {repository.name}
                </h1>
                <p className="mt-1 text-xs text-muted">
                  Repository overview
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
              {repository.description ||
                'No description provided for this repository.'}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/code`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Code2 size={16} />
              Browse code
            </Link>

            <Link
              href={`/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/settings`}
              aria-label="Repository settings"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-2.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <Settings size={17} />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch size={14} />
            {repository.defaultBranch}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} />
            Created {createdDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            Updated {updatedDate}
          </span>
        </div>
      </header>

      <section aria-label="Repository summary">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Repository summary
          </h2>
          <span className="text-xs text-muted">Basic information</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              {repository.isPrivate ? (
                <LockKeyhole size={15} />
              ) : (
                <Globe2 size={15} />
              )}
              Visibility
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {repository.isPrivate ? 'Private repository' : 'Public repository'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {repository.isPrivate
                ? 'Access is restricted.'
                : 'Visible to everyone.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <GitBranch size={15} />
              Default branch
            </div>
            <p className="mt-3 break-all font-mono text-sm font-semibold text-foreground">
              {repository.defaultBranch}
            </p>
            <p className="mt-1 text-xs text-muted">
              Main development branch
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <Clock3 size={15} />
              Last updated
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {updatedDate}
            </p>
            <p className="mt-1 text-xs text-muted">
              Latest repository activity
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Code2 size={17} className="text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Clone repository
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Get a local copy of this repository.
            </p>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs text-muted">
              {cloneUrl}
            </code>

            <button
              type="button"
              onClick={handleCopyCloneUrl}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
          </div>

          {copyError && (
            <p role="status" className="text-xs text-danger">
              {copyError}
            </p>
          )}

          <div className="rounded-xl bg-surface-muted/70 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">
              Clone using Git
            </p>
            <code className="block overflow-x-auto font-mono text-xs text-foreground">
              git clone {cloneUrl}
            </code>
          </div>

          {repository.isPrivate && (
            <p className="text-xs leading-5 text-muted">
              Private repository uchun Git so‘raganida shaxsiy access token
              orqali autentifikatsiyadan o‘ting. Tokenni clone URL ichiga
              yozmang.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <FolderGit2 size={17} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Repository information
          </h2>
        </div>

        <dl className="divide-y divide-border px-5">
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-muted">Repository owner</dt>
            <dd className="break-all text-sm font-medium text-foreground">
              {owner}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <CalendarDays size={15} />
              Created
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {createdDate}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <Clock3 size={15} />
              Last activity
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {updatedDate}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-muted">Repository visibility</dt>
            <dd className="text-sm font-medium text-foreground">
              {repository.isPrivate ? 'Private' : 'Public'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Continue exploring
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Explore the repository source code and its development history.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/branches`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-surface-muted"
          >
            <GitBranch size={14} />
            Branches
            <ExternalLink size={12} className="text-muted" />
          </Link>

          <Link
            href={`/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/commits`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-surface-muted"
          >
            <Star size={14} />
            Commit history
            <ExternalLink size={12} className="text-muted" />
          </Link>
        </div>
      </section>
    </div>
  );
}
