'use client';

import Link from 'next/link';
import { FiAperture, FiArrowUpRight } from 'react-icons/fi';

interface RepositoryCreateCTAProps {
  variant?: 'header' | 'inline';
}

export default function RepositoryCreateCTA({ variant = 'inline' }: RepositoryCreateCTAProps) {
  if (variant === 'header') {
    return (
      <Link
        href="/new"
        aria-label="Create a new repository"
        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3.5 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FiAperture size={16} className="transition-transform duration-300 group-hover:rotate-45" />
        <span>Create</span>
        <FiArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <Link
      href="/new"
      className="group inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-primary transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
        <FiAperture
          size={19}
          className="transition-transform duration-300 group-hover:rotate-45"
        />
      </span>

      <span className="flex flex-col text-left">
        <span className="text-sm font-semibold">Create repository</span>
        <span className="mt-0.5 text-[10px] text-muted">Start a new project</span>
      </span>

      <FiArrowUpRight
        size={16}
        className="ml-1 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
