'use client';

import { useEffect, useState } from 'react';

import { userService, type ContributionStats } from '@/services/user.service';

export default function DashboardProfilePage() {
  const [contributions, setContributions] = useState<ContributionStats | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchContributionData = async () => {
      try {
        const storedUser = localStorage.getItem('user');

        if (!storedUser) return;

        const parsed = JSON.parse(storedUser) as {
          username?: string;
        };

        if (!parsed.username) return;

        const response = await userService.getContributions(parsed.username);

        if (isMounted && response.success && response.data) {
          setContributions(response.data);
        }
      } catch (error) {
        console.error('Contribution maʼlumotlarini yuklashda xatolik:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchContributionData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-primary"
        aria-busy="true"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-mono text-muted">Activity maʼlumotlari yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Developer activity
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>

          <p className="mt-1 text-sm text-muted">
            Your development activity and contribution history.
          </p>
        </div>

        <span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-muted">
          {new Date().getFullYear()}
        </span>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Total contributions</p>

          <p className="mt-2 text-3xl font-bold text-foreground">{contributions?.total || 0}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Active days</p>

          <p className="mt-2 text-3xl font-bold text-foreground">
            {contributions?.activeDays || 0}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Current streak</p>

          <p className="mt-2 text-3xl font-bold text-foreground">
            {contributions?.currentStreak || 0}
            <span className="ml-2 text-sm font-normal text-muted">days</span>
          </p>
        </div>
      </section>

      <section className="cyber-card space-y-5 rounded-xl p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-foreground">Contribution activity</h2>

            <p className="mt-1 text-xs text-muted">
              Your daily development activity throughout the year.
            </p>
          </div>

          <span className="text-xs font-mono text-muted">
            {contributions?.activeDays || 0} active days
          </span>
        </div>

        <div className="w-full min-w-0">
          <div className="grid w-full min-w-0 grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] grid-rows-7 gap-0.5">
            {contributions?.days && contributions.days.length > 0
              ? contributions.days.map((day, index) => {
                  let levelClass = 'bg-[#21262d]';

                  if (day.count > 0 && day.count <= 2) {
                    levelClass = 'bg-amber-950';
                  } else if (day.count > 2 && day.count <= 5) {
                    levelClass = 'bg-amber-700';
                  } else if (day.count > 5) {
                    levelClass = 'bg-amber-500';
                  }

                  return (
                    <div
                      key={`${day.date}-${index}`}
                      className={`aspect-square min-w-0 rounded-xs ${levelClass}`}
                      title={`${day.date}: ${day.count} contributions`}
                    />
                  );
                })
              : Array.from({ length: 140 }).map((_, index) => (
                  <div key={index} className="aspect-square min-w-0 rounded-xs bg-[#21262d]" />
                ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted">
          <span>Less</span>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#21262d]" />
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-950" />
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-700" />
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
          </div>

          <span>More</span>
        </div>
      </section>
    </div>
  );
}
