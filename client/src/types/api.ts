// src/types/api.ts

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends AuthUser {
  location: string | null;
  website: string | null;
}

export interface Repository {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface ContributionStats {
  from: string;
  to: string;
  total: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  breakdown: {
    repositories: number;
    issues: number;
    pullRequests: number;
  };
  days: {
    date: string;
    count: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type CurrentUserResponse = ApiResponse<{
  user: AuthUser;
}>;

export type UserProfileResponse = ApiResponse<{
  user: UserProfile;
}>;

export type ContributionStatsResponse = ApiResponse<ContributionStats>;

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
