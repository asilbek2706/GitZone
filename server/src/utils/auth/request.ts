import type { Request } from 'express';

import { getRefreshTokenCookieName } from './cookies.js';
import type { SessionMetadata } from '../../types/auth.types.js';

export const getSessionMetadata = (req: Request): SessionMetadata => ({
  userAgent: req.get('user-agent') ?? null,
  ipAddress: req.ip ?? null,
});

export const getRefreshTokenFromCookie = (req: Request): string | undefined => {
  return req.cookies?.[getRefreshTokenCookieName()];
};
