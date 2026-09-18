import prisma from '../../config/prisma.js';
import { env } from '../../config/env.js';
import type { AuthResponse, AuthUser, SessionMetadata } from '../../types/auth.types.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/auth/tokens.js';
import { parseDurationToMilliseconds } from '../../utils/duration.js';

const REFRESH_TOKEN_EXPIRES_IN_MS = parseDurationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN);

type SessionUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toAuthUser = (user: SessionUser): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getRefreshTokenExpiresAt = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
};

export const issueAuthSession = async (
  user: SessionUser,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshToken.tokenHash,
      refreshTokenJti: refreshToken.jti,
      tokenFamilyId: refreshToken.jti,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      lastUsedAt: new Date(),
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
};
