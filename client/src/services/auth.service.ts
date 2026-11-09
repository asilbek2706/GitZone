import { api } from '@/lib/api';
import { AuthUser } from '@/types/api';

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
  // Oddiy login qilish
  async login(credentials: LoginRequest) {
    return api.post<AuthDataResponse>('api/auth/login', credentials);
  },

  // Ro'yxatdan o'tish
  async register(data: RegisterRequest) {
    return api.post<AuthDataResponse>('api/auth/register', data);
  },

  // 2FA kodini tasdiqlash (agar login paytida 2FA talab qilinsa)
  async verifyTwoFactor(data: TwoFactorVerifyRequest) {
    return api.post<AuthDataResponse>('api/auth/2fa/login/verify', data);
  },

  // Joriy foydalanuvchi ma'lumotlarini olish
  async getCurrentUser(token: string) {
    return api.get<{ success: boolean; data: { user: AuthUser } }>('api/auth/me', { token });
  },

  // Tizimdan chiqish
  async logout() {
    return api.post<{ success: boolean; message: string }>('api/auth/logout', {});
  },
};
