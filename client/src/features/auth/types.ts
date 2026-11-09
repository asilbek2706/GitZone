// Swagger (openapi.json) sxemalariga mos. Keyinchalik `npm run api:types` tiplariga almashtirish mumkin.
export interface ApiEnvelope<T> { success: true; data: T }

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

export interface AuthData { user: AuthUser; accessToken: string }

export type LoginData =
  | { requiresTwoFactor: false; user: AuthUser; accessToken: string }
  | { requiresTwoFactor: true; challengeToken: string; expiresAt: string };

export interface RegisterBody { username: string; email: string; password: string; name?: string }
export interface LoginBody { email: string; password: string }

export interface AuthSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface PersonalAccessToken {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedToken { token: string; id: string; name: string; expiresAt: string | null; createdAt: string }
export interface TwoFactorSetup { secret: string; provisioningUri: string; qrCodeDataUrl: string }
