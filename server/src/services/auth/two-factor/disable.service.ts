import bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';

import prisma from '../../../config/prisma.js';
import { AppError } from '../../../errors/app.error.js';
import { decryptTwoFactorSecret } from '../../../utils/auth/two-factor/crypto.js';

const TOTP_ISSUER = 'GitZone';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_VALIDATION_WINDOW = 1;

export const disableTwoFactorAuthentication = async (
  userId: string,
  password: string,
  code: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      password: true,
      twoFactorAuthentication: {
        select: {
          id: true,
          encryptedSecret: true,
          enabledAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid current password', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const twoFactorAuthentication = user.twoFactorAuthentication;

  if (!twoFactorAuthentication?.enabledAt) {
    throw new AppError(
      'Two-factor authentication is not enabled',
      409,
      'TWO_FACTOR_NOT_ENABLED',
    );
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
    throw new AppError(
      'Invalid two-factor authentication code',
      401,
      'INVALID_TWO_FACTOR_CODE',
    );
  }

  const disabled = await prisma.$transaction(async (tx) => {
    const deleteResult = await tx.twoFactorAuthentication.deleteMany({
      where: {
        id: twoFactorAuthentication.id,
        userId,
        enabledAt: {
          not: null,
        },
      },
    });

    if (deleteResult.count !== 1) {
      return false;
    }

    await tx.recoveryCode.deleteMany({
      where: {
        userId,
      },
    });

    await tx.twoFactorChallenge.deleteMany({
      where: {
        userId,
      },
    });

    return true;
  });

  if (!disabled) {
    throw new AppError(
      'Two-factor authentication is not enabled',
      409,
      'TWO_FACTOR_NOT_ENABLED',
    );
  }
};
