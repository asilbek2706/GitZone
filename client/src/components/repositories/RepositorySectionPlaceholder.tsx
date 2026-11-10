'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function RepositorySectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const params = useParams<{ owner: string; repo: string }>();
  const overviewUrl = `/dashboard/repositories/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}`;

  return (
    <section className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
        {description}
      </p>
      <p className="mt-3 text-xs text-muted">
        This section is part of the Repository Detail workspace.
      </p>
      <Link
        href={overviewUrl}
        className="mt-6 inline-flex rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
      >
        Back to Overview
      </Link>
    </section>
  );
}
