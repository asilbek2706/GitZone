import * as OTPAuth from 'otpauth';

import prisma from '../../../config/prisma.js';
import { AppError } from '../../../errors/app.error.js';
import { decryptTwoFactorSecret } from '../../../utils/auth/two-factor/crypto.js';
import { generateRecoveryCodes } from '../../../utils/auth/two-factor/recovery-code.js';

const TOTP_ISSUER = 'GitZone';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_VALIDATION_WINDOW = 1;

export interface TwoFactorVerificationResult {
  recoveryCodes: string[];
}

export const verifyTwoFactorSetup = async (
  userId: string,
  code: string,
): Promise<TwoFactorVerificationResult> => {
  const twoFactorAuthentication = await prisma.twoFactorAuthentication.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      encryptedSecret: true,
      enabledAt: true,
    },
  });

  if (!twoFactorAuthentication) {
    throw new AppError(
      'Two-factor authentication setup not found',
      404,
      'TWO_FACTOR_SETUP_NOT_FOUND',
    );
  }

  if (twoFactorAuthentication.enabledAt) {
    throw new AppError(
      'Two-factor authentication is already enabled',
      409,
      'TWO_FACTOR_ALREADY_ENABLED',
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
    throw new AppError('Invalid two-factor authentication code', 401, 'INVALID_TWO_FACTOR_CODE');
  }

  const recoveryCodes = generateRecoveryCodes();
  const enabledAt = new Date();

  const enabled = await prisma.$transaction(async (tx) => {
    const enableResult = await tx.twoFactorAuthentication.updateMany({
      where: {
        id: twoFactorAuthentication.id,
        userId,
        enabledAt: null,
      },
      data: {
        enabledAt,
      },
    });

    if (enableResult.count !== 1) {
      return false;
    }

    await tx.recoveryCode.deleteMany({
      where: {
        userId,
      },
    });

    await tx.recoveryCode.createMany({
      data: recoveryCodes.map(({ codeHash }) => ({
        userId,
        codeHash,
      })),
    });

    return true;
  });

  if (!enabled) {
    throw new AppError(
      'Two-factor authentication setup has already been completed',
      409,
      'TWO_FACTOR_SETUP_ALREADY_COMPLETED',
    );
  }

  return {
    recoveryCodes: recoveryCodes.map(({ code: recoveryCode }) => recoveryCode),
  };
};
