import type { Request, Response } from 'express';

import { AppError } from '../../../errors/app.error.js';
import { verifyTwoFactorLoginChallenge } from '../../../services/auth/two-factor/login-challenge.service.js';
import { setRefreshTokenCookie } from '../../../utils/auth/cookies.js';
import { getSessionMetadata } from '../../../utils/auth/request.js';
import { verifyTwoFactorLoginChallengeSchema } from '../../../validations/auth/two-factor/login-challenge.validation.js';

export const verifyTwoFactorLogin = async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyTwoFactorLoginChallengeSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const auth = await verifyTwoFactorLoginChallenge(
    parsed.data.challengeToken,
    parsed.data.code,
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
