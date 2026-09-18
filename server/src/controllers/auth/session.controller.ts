import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import { getRefreshTokenFromCookie } from '../../utils/auth/request.js';
import {
  getActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from '../../services/auth/session.service.js';

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const sessions = await getActiveSessions(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      sessions,
    },
  });
};

export const revokeSessionById = async (
  req: Request<{ sessionId: string }>,
  res: Response,
): Promise<void> => {
  const { sessionId } = req.params;
  const { userId } = req as Request<{
    sessionId: string;
  }> & {
    userId: string;
  };

  await revokeSession(userId, sessionId);

  res.status(200).json({
    success: true,
    message: 'Session revoked successfully',
  });
};

export const revokeAllOtherSessions = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const refreshToken = getRefreshTokenFromCookie(req);

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  const revokedSessions = await revokeOtherSessions(authenticatedReq.userId, refreshToken);

  res.status(200).json({
    success: true,
    data: {
      revokedSessions,
    },
    message: 'Other sessions revoked successfully',
  });
};
