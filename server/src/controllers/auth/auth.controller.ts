import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../../utils/auth/cookies.js';
import { getRefreshTokenFromCookie, getSessionMetadata } from '../../utils/auth/request.js';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuth,
  registerUser,
} from '../../services/auth/auth.service.js';
import { loginSchema, registerSchema } from '../../validations/auth/auth.validation.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const auth = await registerUser(
    {
      username: result.data.username,
      email: result.data.email,
      password: result.data.password,
      ...(result.data.name !== undefined ? { name: result.data.name } : {}),
    },
    getSessionMetadata(req),
  );

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};

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

export const me = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const user = await getCurrentUser(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};

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
