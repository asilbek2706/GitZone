export interface ContributionDay {
  date: string;
  count: number;
}

export interface ContributionBreakdown {
  repositories: number;
  issues: number;
  pullRequests: number;
}

export interface ProfileContributionsResponse {
  from: string;
  to: string;
  total: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  breakdown: ContributionBreakdown;
  days: ContributionDay[];
}
