import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

import {
  setupTwoFactorAuthentication,
  verifyTwoFactorSetup,
} from './two-factor/two-factor.service.js';

import {
  clearRefreshTokenCookie,
  getRefreshTokenCookieName,
  setRefreshTokenCookie,
} from './auth.cookies.js';

import {
  getActiveSessions,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuth,
  registerUser,
  revokeOtherSessions,
  revokeSession,
} from './auth.service.js';

import {
  createPersonalAccessToken,
  getPersonalAccessTokens,
  revokePersonalAccessToken,
} from './pat.service.js';

import {
  createPersonalAccessTokenSchema,
  loginSchema,
  registerSchema,
  verifyTwoFactorSetupSchema,
} from './auth.validation.js';
import { AppError } from '../../errors/app.error.js';
import type { SessionMetadata } from './auth.types.js';

const getSessionMetadata = (req: Request): SessionMetadata => ({
  userAgent: req.get('user-agent') ?? null,
  ipAddress: req.ip ?? null,
});

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

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
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

export const getRefreshTokenFromCookie = (req: Request): string | undefined => {
  return req.cookies?.[getRefreshTokenCookieName()];
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
  const { userId } = req as Request<{ sessionId: string }> & { userId: string };

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

export const createToken = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const result = createPersonalAccessTokenSchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const personalAccessToken = await createPersonalAccessToken(
    authenticatedReq.userId,
    result.data.name,
    result.data.expiresAt ? new Date(result.data.expiresAt) : null,
  );

  res.status(201).json({
    success: true,
    data: {
      token: personalAccessToken.token,
      id: personalAccessToken.id,
      name: personalAccessToken.name,
      expiresAt: personalAccessToken.expiresAt,
      createdAt: personalAccessToken.createdAt,
    },
  });
};

export const listTokens = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const personalAccessTokens = await getPersonalAccessTokens(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      tokens: personalAccessTokens,
    },
  });
};

export const revokeToken = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const tokenId = req.params.tokenId;

  if (typeof tokenId !== 'string') {
    throw new AppError(
      'Personal access token ID is required',
      400,
      'PERSONAL_ACCESS_TOKEN_ID_REQUIRED',
    );
  }

  await revokePersonalAccessToken(authenticatedReq.userId, tokenId);

  res.status(200).json({
    success: true,
    message: 'Personal access token revoked successfully',
  });
};

export const setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const setup = await setupTwoFactorAuthentication(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: setup,
  });
};

export const verifyTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const parsed = verifyTwoFactorSetupSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const result = await verifyTwoFactorSetup(authenticatedReq.userId, parsed.data.code);

  res.status(200).json({
    success: true,
    data: result,
  });
};
