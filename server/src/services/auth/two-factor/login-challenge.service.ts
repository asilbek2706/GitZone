import * as OTPAuth from 'otpauth';

import prisma from '../../../config/prisma.js';
import { AppError } from '../../../errors/app.error.js';
import type { AuthResponse, SessionMetadata } from '../../../types/auth.types.js';
import { hashTwoFactorChallengeToken } from '../../../utils/auth/two-factor/challenge.js';
import { decryptTwoFactorSecret } from '../../../utils/auth/two-factor/crypto.js';
import { issueAuthSession } from '../session-issuer.service.js';

const TOTP_ISSUER = 'GitZone';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_VALIDATION_WINDOW = 1;

const MAX_CHALLENGE_ATTEMPTS = 5;

const invalidChallengeError = (): AppError => {
  return new AppError(
    'Invalid or expired two-factor authentication challenge',
    401,
    'INVALID_TWO_FACTOR_CHALLENGE',
  );
};

export const verifyTwoFactorLoginChallenge = async (
  challengeToken: string,
  code: string,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
  const tokenHash = hashTwoFactorChallengeToken(challengeToken);
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

  const twoFactorAuthentication = challenge.user.twoFactorAuthentication;

  if (!twoFactorAuthentication?.enabledAt) {
    throw invalidChallengeError();
  }

  let secret: string;

  try {
    secret = decryptTwoFactorSecret(twoFactorAuthentication.encryptedSecret);
  } catch {
    throw new AppError(
      'Unable to verify two-factor authentication',
      500,
      'TWO_FACTOR_SECRET_INVALID',
    );
  }

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({
    token: code,
    window: TOTP_VALIDATION_WINDOW,
  });

  if (delta === null) {
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

    throw new AppError(
      'Invalid two-factor authentication code',
      401,
      'INVALID_TWO_FACTOR_CODE',
    );
  }

  const consumedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.twoFactorChallenge.updateMany({
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

    if (consumed.count !== 1) {
      throw invalidChallengeError();
    }

    return issueAuthSession(challenge.user, metadata, tx);
  });
};
