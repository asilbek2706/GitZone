import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { AuthSession } from '../../types/auth.types.js';
import { hashRefreshToken } from '../../utils/auth/tokens.js';

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
