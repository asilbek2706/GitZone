import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app.error.js';
import { verifyAccessToken } from '../utils/auth/tokens.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    throw new AppError('Authorization header is required', 401, 'AUTHORIZATION_REQUIRED');
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid authorization header', 401, 'INVALID_AUTHORIZATION_HEADER');
  }

  try {
    const payload = verifyAccessToken(token);

    (req as AuthenticatedRequest).userId = payload.sub;

    next();
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
  }
};
