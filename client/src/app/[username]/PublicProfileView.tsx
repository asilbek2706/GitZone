'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookMarked, CalendarDays, ExternalLink, GitFork, MapPin, Star } from 'lucide-react';

import { userService, type User } from '@/services/user.service';
import { repositoryService, type Repository } from '@/services/repository.service';

interface PublicProfileViewProps {
  username: string;
  activeTab: 'overview' | 'repositories';
}

export default function PublicProfileView({ username, activeTab }: PublicProfileViewProps) {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repositoriesError, setRepositoriesError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setRepositoriesError(false);

      try {
        const profileResult = await userService.getProfile(username);

        if (!profileResult.success || !profileResult.data?.user) {
          throw new Error('Profile could not be loaded.');
        }

        if (!isMounted) return;

        setUser(profileResult.data.user);

        try {
          const repositoryResult = await repositoryService.getUserRepositories(username);

          if (isMounted && repositoryResult.success) {
            setRepositories(repositoryResult.data.repositories);
          }
        } catch {
          if (isMounted) {
            setRepositoriesError(true);
          }
        }
      } catch {
        if (isMounted) {
          setError('User profile could not be found or loaded.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
        aria-busy="true"
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Loading public profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">User not found</h1>

        <p className="max-w-md text-sm text-muted">
          The profile you are looking for does not exist or could not be loaded.
        </p>

        <Link
          href="/"
          className="mt-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const displayName = user.name || user.username;

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const avatarSrc = (() => {
    if (!user.avatarUrl) return null;

    try {
      const parsedUrl = new URL(user.avatarUrl, 'https://gitzone.local');

      return ['http:', 'https:'].includes(parsedUrl.protocol) ? user.avatarUrl : null;
    } catch {
      return null;
    }
  })();

  const formattedJoinDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));

  const publicRepositories = repositories.filter((repository) => !repository.isPrivate);

  const visibleRepositories =
    activeTab === 'overview' ? publicRepositories.slice(0, 6) : publicRepositories;

  const profileUrl = `/${encodeURIComponent(user.username)}`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      {/* Profile header */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-3xl font-bold text-primary sm:h-36 sm:w-36">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={`${displayName}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials || '?'
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {displayName}
              </h1>

              <p className="mt-1 text-base text-muted">@{user.username}</p>
            </div>

            {user.bio && (
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-7 text-foreground">
                {user.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
              {user.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </span>
              )}

              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </a>
              )}

              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Joined {formattedJoinDate}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-5 border-t border-border pt-5 text-sm">
          <span className="inline-flex items-center gap-2 text-foreground">
            <BookMarked className="h-4 w-4 text-muted" />
            <strong>{publicRepositories.length}</strong>
            <span className="text-muted">public repositories</span>
          </span>
        </div>
      </section>

      {/* Profile navigation */}
      <nav
        className="flex gap-6 overflow-x-auto border-b border-border"
        aria-label="Profile navigation"
      >
        <Link
          href={profileUrl}
          aria-current={activeTab === 'overview' ? 'page' : undefined}
          className={`relative shrink-0 pb-3 text-sm font-medium transition ${
            activeTab === 'overview'
              ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Overview
        </Link>

        <Link
          href={`${profileUrl}?tab=repositories`}
          aria-current={activeTab === 'repositories' ? 'page' : undefined}
          className={`relative inline-flex shrink-0 items-center gap-2 pb-3 text-sm font-medium transition ${
            activeTab === 'repositories'
              ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <BookMarked className="h-4 w-4" />
          Repositories
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
            {publicRepositories.length}
          </span>
        </Link>
      </nav>

      {/* Repository section */}
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {activeTab === 'overview' ? 'Popular repositories' : 'Public repositories'}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {activeTab === 'overview'
                ? `Explore ${user.username}'s public work.`
                : `All public repositories by ${user.username}.`}
            </p>
          </div>

          {activeTab === 'overview' && publicRepositories.length > 6 && (
            <Link
              href={`${profileUrl}?tab=repositories`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all repositories
            </Link>
          )}
        </div>

        {repositoriesError ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-muted">
              Repositories could not be loaded. Please try again later.
            </p>
          </div>
        ) : visibleRepositories.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <BookMarked className="mx-auto h-8 w-8 text-muted" />

            <h3 className="mt-4 font-semibold text-foreground">No public repositories yet</h3>

            <p className="mt-2 text-sm text-muted">
              Public repositories will appear here when available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleRepositories.map((repository) => (
              <article
                key={repository.id}
                className="group rounded-xl border border-border bg-surface p-5 transition duration-200 hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/${encodeURIComponent(user.username)}/${encodeURIComponent(repository.name)}`}
                    className="break-all font-semibold text-primary hover:underline"
                  >
                    {repository.name}
                  </Link>

                  <span className="shrink-0 rounded-full border border-success/25 px-2.5 py-1 text-[11px] text-success">
                    Public
                  </span>
                </div>

                <p className="mt-3 min-h-10 text-sm leading-6 text-muted">
                  {repository.description || 'No description provided.'}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <GitFork className="h-3.5 w-3.5" />
                    {repository.defaultBranch}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    Repository
                  </span>

                  <span>
                    Updated{' '}
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(repository.updatedAt))}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
