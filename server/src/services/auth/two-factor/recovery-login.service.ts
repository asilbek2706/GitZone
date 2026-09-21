import prisma from '../../../config/prisma.js';
import { AppError } from '../../../errors/app.error.js';
import type { AuthResponse, SessionMetadata } from '../../../types/auth.types.js';
import { hashTwoFactorChallengeToken } from '../../../utils/auth/two-factor/challenge.js';
import { hashRecoveryCode } from '../../../utils/auth/two-factor/recovery-code.js';
import { issueAuthSession } from '../session-issuer.service.js';

const MAX_CHALLENGE_ATTEMPTS = 5;

const invalidChallengeError = (): AppError => {
  return new AppError(
    'Invalid or expired two-factor authentication challenge',
    401,
    'INVALID_TWO_FACTOR_CHALLENGE',
  );
};

const invalidRecoveryCodeError = (): AppError => {
  return new AppError(
    'Invalid recovery code',
    401,
    'INVALID_RECOVERY_CODE',
  );
};

export const verifyTwoFactorRecoveryLogin = async (
  challengeToken: string,
  recoveryCode: string,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
  const tokenHash = hashTwoFactorChallengeToken(challengeToken);
  const recoveryCodeHash = hashRecoveryCode(recoveryCode);
  const now = new Date();

  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          twoFactorAuthentication: true,
        },
      },
    },
  });

  if (
    !challenge ||
    challenge.usedAt ||
    challenge.expiresAt <= now ||
    challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS
  ) {
    throw invalidChallengeError();
  }

  if (!challenge.user.twoFactorAuthentication?.enabledAt) {
    throw invalidChallengeError();
  }

  const storedRecoveryCode = await prisma.recoveryCode.findFirst({
    where: {
      userId: challenge.userId,
      codeHash: recoveryCodeHash,
      usedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!storedRecoveryCode) {
    const attempt = await prisma.twoFactorChallenge.updateMany({
      where: {
        id: challenge.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
        attemptCount: {
          lt: MAX_CHALLENGE_ATTEMPTS,
        },
      },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });

    if (attempt.count !== 1) {
      throw invalidChallengeError();
    }

    throw invalidRecoveryCodeError();
  }

  const consumedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const consumedRecoveryCode = await tx.recoveryCode.updateMany({
      where: {
        id: storedRecoveryCode.id,
        userId: challenge.userId,
        codeHash: recoveryCodeHash,
        usedAt: null,
      },
      data: {
        usedAt: consumedAt,
      },
    });

    if (consumedRecoveryCode.count !== 1) {
      throw invalidRecoveryCodeError();
    }

    const consumedChallenge = await tx.twoFactorChallenge.updateMany({
      where: {
        id: challenge.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: consumedAt,
        },
        attemptCount: {
          lt: MAX_CHALLENGE_ATTEMPTS,
        },
      },
      data: {
        usedAt: consumedAt,
      },
    });

    if (consumedChallenge.count !== 1) {
      throw invalidChallengeError();
    }

    return issueAuthSession(challenge.user, metadata, tx);
  });
};
