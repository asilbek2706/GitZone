import type { Request, Response } from 'express';

import { logoutUser } from '../../services/auth/logout.service.js';
import { clearRefreshTokenCookie } from '../../utils/auth/cookies.js';
import { getRefreshTokenFromCookie } from '../../utils/auth/request.js';

export const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = getRefreshTokenFromCookie(req);

  if (refreshToken) {
    await logoutUser(refreshToken);
  }

  clearRefreshTokenCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
