import bcrypt from 'bcrypt';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { env } from '../../config/env.js';
import { parseDurationToMilliseconds } from '../../utils/duration.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from './auth.tokens.js';
import type {
  AuthResponse,
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  SessionMetadata,
  LoginResponse,
} from './auth.types.js';
import { generateTwoFactorChallengeToken } from './two-factor/two-factor.challenge.js';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRES_IN_MS = parseDurationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN);

const toAuthUser = (user: {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getRefreshTokenExpiresAt = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
};

const revokeCompromisedTokenFamily = async (
  tokenFamilyId: string,
  reusedSessionId: string,
): Promise<void> => {
  const detectedAt = new Date();

  await prisma.$transaction([
    prisma.session.updateMany({
      where: {
        tokenFamilyId,
        revokedAt: null,
      },
      data: {
        revokedAt: detectedAt,
      },
    }),
    prisma.session.updateMany({
      where: {
        id: reusedSessionId,
        reuseDetectedAt: null,
      },
      data: {
        reuseDetectedAt: detectedAt,
      },
    }),
  ]);
};

const throwRefreshTokenReuseDetected = async (
  tokenFamilyId: string,
  reusedSessionId: string,
): Promise<never> => {
  await revokeCompromisedTokenFamily(tokenFamilyId, reusedSessionId);

  throw new AppError('Refresh token reuse detected', 401, 'REFRESH_TOKEN_REUSE_DETECTED');
};

export const registerUser = async (
  input: RegisterInput,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.username }, { email: input.email }],
    },
  });

  if (existingUser) {
    if (existingUser.username === input.username) {
      throw new AppError('Username is already taken', 409, 'USERNAME_TAKEN');
    }

    throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      password: hashedPassword,
      name: input.name ?? null,
    },
  });

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

export const loginUser = async (
  input: LoginInput,
  metadata: SessionMetadata,
): Promise<LoginResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      twoFactorAuthentication: {
        select: {
          enabledAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const twoFactorEnabled =
    user.twoFactorAuthentication?.enabledAt !== null &&
    user.twoFactorAuthentication?.enabledAt !== undefined;

  if (twoFactorEnabled) {
    const challenge = generateTwoFactorChallengeToken();

    await prisma.twoFactorChallenge.create({
      data: {
        userId: user.id,
        tokenHash: challenge.tokenHash,
        expiresAt: challenge.expiresAt,
      },
    });

    return {
      requiresTwoFactor: true,
      challengeToken: challenge.token,
      expiresAt: challenge.expiresAt,
    };
  }

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
    requiresTwoFactor: false,
    user: toAuthUser(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
};

export const refreshAuth = async (
  refreshToken: string,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
  const payload = verifyRefreshToken(refreshToken);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: {
      refreshTokenHash,
    },
  });

  if (!session) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (session.userId !== payload.sub) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const isLegacySession = session.refreshTokenJti.startsWith('legacy:');

  if (!isLegacySession && session.refreshTokenJti !== payload.jti) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (session.rotatedAt !== null || session.replacedById !== null) {
    return throwRefreshTokenReuseDetected(session.tokenFamilyId, session.id);
  }

  if (session.revokedAt !== null) {
    throw new AppError('Refresh token has been revoked', 401, 'REFRESH_TOKEN_REVOKED');
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 401, 'USER_NOT_FOUND');
  }

  const accessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);
  const rotatedAt = new Date();

  const rotationResult = await prisma.$transaction(async (tx) => {
    const claimResult = await tx.session.updateMany({
      where: {
        id: session.id,
        userId: session.userId,
        refreshTokenHash,
        revokedAt: null,
        rotatedAt: null,
        replacedById: null,
        expiresAt: {
          gt: rotatedAt,
        },
      },
      data: {
        revokedAt: rotatedAt,
        rotatedAt,
        lastUsedAt: rotatedAt,
      },
    });

    if (claimResult.count !== 1) {
      return null;
    }

    const replacement = await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: newRefreshToken.tokenHash,
        refreshTokenJti: newRefreshToken.jti,
        tokenFamilyId: session.tokenFamilyId,
        parentSessionId: session.id,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        lastUsedAt: rotatedAt,
        expiresAt: getRefreshTokenExpiresAt(),
      },
    });

    await tx.session.update({
      where: {
        id: session.id,
      },
      data: {
        replacedById: replacement.id,
      },
    });

    return replacement.id;
  });

  if (rotationResult === null) {
    return throwRefreshTokenReuseDetected(session.tokenFamilyId, session.id);
  }

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken: newRefreshToken.token,
  };
};

export const getCurrentUser = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return toAuthUser(user);
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const getActiveSessions = async (userId: string): Promise<AuthSession[]> => {
  return prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      revokedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
};

export const revokeOtherSessions = async (
  userId: string,
  currentRefreshToken: string,
): Promise<number> => {
  const currentRefreshTokenHash = hashRefreshToken(currentRefreshToken);

  const currentSession = await prisma.session.findUnique({
    where: {
      refreshTokenHash: currentRefreshTokenHash,
    },
  });

  if (
    !currentSession ||
    currentSession.userId !== userId ||
    currentSession.revokedAt !== null ||
    currentSession.expiresAt <= new Date()
  ) {
    throw new AppError('Current refresh session is invalid', 401, 'INVALID_REFRESH_SESSION');
  }

  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      id: {
        not: currentSession.id,
      },
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
};
