// src/services/user.service.ts
import { api } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  createdAt: string;
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
  days: { date: string; count: number }[];
}

export const userService = {
  async getProfile(username: string) {
    const response = await api.get<{ success: boolean; data: { user: User } }>(
      `/api/users/${username}`,
    );
    return response.data;
  },

  async updateProfile(data: Partial<User>) {
    const response = await api.patch<{ success: boolean; data: { user: User } }>(
      '/api/users/me',
      data,
    );
    return response.data;
  },

  async getContributions(username: string) {
    const response = await api.get<{ success: boolean; data: ContributionStats }>(
      `/api/users/${username}/contributions`,
    );
    return response.data;
  },
};
