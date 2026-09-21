import type { Request, Response } from 'express';

import { AppError } from '../../../errors/app.error.js';
import { verifyTwoFactorRecoveryLogin } from '../../../services/auth/two-factor/recovery-login.service.js';
import { setRefreshTokenCookie } from '../../../utils/auth/cookies.js';
import { getSessionMetadata } from '../../../utils/auth/request.js';
import { verifyTwoFactorRecoveryLoginSchema } from '../../../validations/auth/two-factor/recovery-login.validation.js';

export const verifyTwoFactorRecoveryLoginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = verifyTwoFactorRecoveryLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const auth = await verifyTwoFactorRecoveryLogin(
    parsed.data.challengeToken,
    parsed.data.recoveryCode,
    getSessionMetadata(req),
  );

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};
