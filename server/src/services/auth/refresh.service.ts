import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { AuthResponse, SessionMetadata } from '../../types/auth.types.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../../utils/auth/tokens.js';
import { getRefreshTokenExpiresAt, toAuthUser } from './session-issuer.service.js';

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
