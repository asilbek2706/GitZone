import type { Request, Response } from 'express';

import { AppError } from '../../errors/app.error.js';
import { loginUser } from '../../services/auth/login.service.js';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../../utils/auth/cookies.js';
import { getSessionMetadata } from '../../utils/auth/request.js';
import { loginSchema } from '../../validations/auth/login.validation.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const auth = await loginUser(result.data, getSessionMetadata(req));

  if (auth.requiresTwoFactor) {
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      data: {
        requiresTwoFactor: true,
        challengeToken: auth.challengeToken,
        expiresAt: auth.expiresAt,
      },
    });

    return;
  }

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      requiresTwoFactor: false,
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};
