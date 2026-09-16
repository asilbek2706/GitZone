import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const createRateLimitHandler = (message: string) => {
  return (_request: Request, response: Response): void => {
    response.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    });
  };
};

export const createRegisterRateLimiter = () =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler('Too many registration attempts. Please try again later.'),
  });

export const createLoginRateLimiter = () =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler('Too many login attempts. Please try again later.'),
  });

export const createRefreshRateLimiter = () =>
  rateLimit({
    windowMs: FIVE_MINUTES_MS,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many refresh attempts. Please try again later.'),
  });

export const createSecurityActionRateLimiter = () =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: createRateLimitHandler(
      'Too many security-sensitive requests. Please try again later.',
    ),
  });

export const registerRateLimiter = createRegisterRateLimiter();
export const loginRateLimiter = createLoginRateLimiter();
export const refreshRateLimiter = createRefreshRateLimiter();
export const securityActionRateLimiter = createSecurityActionRateLimiter();
