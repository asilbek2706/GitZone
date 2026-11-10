// src/services/auth.service.ts

import { api } from '@/lib/api';
import type { AuthUser, CurrentUserResponse } from '@/types/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export interface TwoFactorVerifyRequest {
  challengeToken: string;
  code: string;
}

export interface AuthDataResponse {
  success: boolean;
  data: {
    user?: AuthUser;
    accessToken?: string;
    requiresTwoFactor?: boolean;
    challengeToken?: string;
    expiresAt?: string;
  };
}

export const authService = {
  async login(credentials: LoginRequest) {
    return api.post<AuthDataResponse>('/api/auth/login', credentials);
  },

  async register(data: RegisterRequest) {
    return api.post<AuthDataResponse>('/api/auth/register', data);
  },

  async verifyTwoFactor(data: TwoFactorVerifyRequest) {
    return api.post<AuthDataResponse>('/api/auth/2fa/login/verify', data);
  },

  async getCurrentUser() {
    return api.get<CurrentUserResponse>('/api/auth/me');
  },

  async logout() {
    return api.post<{ success: boolean; message: string }>('/api/auth/logout', {});
  },
};
