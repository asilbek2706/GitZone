import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

import prisma from '../../../config/prisma.js';
import { AppError } from '../../../errors/app.error.js';
import { encryptTwoFactorSecret } from './two-factor.crypto.js';

const TOTP_ISSUER = 'GitZone';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_SECRET_SIZE = 20;

export interface TwoFactorSetup {
  secret: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
}

const createTotp = (email: string, secret: OTPAuth.Secret): OTPAuth.TOTP => {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });
};

export const setupTwoFactorAuthentication = async (userId: string): Promise<TwoFactorSetup> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      twoFactorAuthentication: {
        select: {
          enabledAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.twoFactorAuthentication?.enabledAt) {
    throw new AppError(
      'Two-factor authentication is already enabled',
      409,
      'TWO_FACTOR_ALREADY_ENABLED',
    );
  }

  const secret = new OTPAuth.Secret({
    size: TOTP_SECRET_SIZE,
  });

  const totp = createTotp(user.email, secret);
  const provisioningUri = totp.toString();
  const encryptedSecret = encryptTwoFactorSecret(secret.base32);

  await prisma.twoFactorAuthentication.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      encryptedSecret,
      enabledAt: null,
    },
    update: {
      encryptedSecret,
      enabledAt: null,
    },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(provisioningUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });

  return {
    secret: secret.base32,
    provisioningUri,
    qrCodeDataUrl,
  };
};
