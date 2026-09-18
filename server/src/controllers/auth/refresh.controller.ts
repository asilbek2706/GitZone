import type { Request, Response } from 'express';

import { AppError } from '../../errors/app.error.js';
import { refreshAuth } from '../../services/auth/refresh.service.js';
import { setRefreshTokenCookie } from '../../utils/auth/cookies.js';
import { getRefreshTokenFromCookie, getSessionMetadata } from '../../utils/auth/request.js';

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = getRefreshTokenFromCookie(req);

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  const auth = await refreshAuth(refreshToken, getSessionMetadata(req));

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};
