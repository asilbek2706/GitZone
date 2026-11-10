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
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-violet-400/30 bg-linear-to-br from-[#35234e] via-[#25203c] to-[#171b2b] px-3 py-2 text-sm font-semibold text-violet-200 shadow-lg shadow-violet-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <FiAperture size={17} className="transition-transform duration-500 group-hover:rotate-90" />
        <span>Create</span>
        <FiArrowUpRight
          size={14}
          className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/new"
      className="group relative flex min-h-11 shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-violet-400/30 bg-linear-to-br from-[#35234e] via-[#25203c] to-[#171b2b] px-4 py-2.5 text-violet-100 shadow-lg shadow-violet-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-xl hover:shadow-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-300/10">
        <FiAperture
          size={21}
          className="text-violet-200 transition-transform duration-500 group-hover:rotate-90"
        />
      </span>

      <span className="flex flex-col text-left">
        <span className="text-sm font-semibold tracking-wide">Create repository</span>
        <span className="mt-0.5 text-[10px] text-violet-200/60">Your next idea starts here</span>
      </span>

      <FiArrowUpRight
        size={17}
        className="ml-1 text-violet-300 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
      />
    </Link>
  );
}

