import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app.error.js';
import { verifyAccessToken } from '../utils/auth/tokens.js';

const BEARER_PATTERN = /^Bearer ([^\s]+)$/;

export interface OptionalAuthenticatedRequest extends Request {
  userId?: string;
}

export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (authorization === undefined) {
    next();
    return;
  }

  const match = BEARER_PATTERN.exec(authorization);

  const token = match?.[1];

  if (!token) {
    throw new AppError('Invalid authorization header', 401, 'INVALID_AUTHORIZATION_HEADER');
  }

  try {
    const payload = verifyAccessToken(token);

    (req as OptionalAuthenticatedRequest).userId = payload.sub;

    next();
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
  }
};
