import type { NextFunction, Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AuthenticatedRequest,
  authMiddleware,
} from '../../../src/middleware/auth.middleware.js';

import { AppError } from '../../../src/errors/app.error.js';
import { verifyAccessToken } from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  verifyAccessToken: vi.fn(),
}));

const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const createRequest = (authorization?: string): Request => {
  return {
    headers: authorization
      ? {
          authorization,
        }
      : {},
  } as Request;
};

const createResponse = (): Response => {
  return {} as Response;
};

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('throws when authorization header is missing', () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    expect(() => authMiddleware(req, res, next)).toThrowError(
      new AppError('Authorization header is required', 401, 'AUTHORIZATION_REQUIRED'),
    );

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when authorization scheme is not Bearer', () => {
    const req = createRequest('Basic abc123');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    expect(() => authMiddleware(req, res, next)).toThrowError(
      new AppError('Invalid authorization header', 401, 'INVALID_AUTHORIZATION_HEADER'),
    );

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when Bearer token is missing', () => {
    const req = createRequest('Bearer');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    expect(() => authMiddleware(req, res, next)).toThrowError(
      new AppError('Invalid authorization header', 401, 'INVALID_AUTHORIZATION_HEADER'),
    );

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when access token is invalid', () => {
    const req = createRequest('Bearer invalid-token');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    mockedVerifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => authMiddleware(req, res, next)).toThrowError(
      new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'),
    );

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('invalid-token');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when access token is expired', () => {
    const req = createRequest('Bearer expired-token');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    mockedVerifyAccessToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => authMiddleware(req, res, next)).toThrowError(
      new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'),
    );

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('expired-token');
    expect(next).not.toHaveBeenCalled();
  });

  it('sets userId when access token is valid', () => {
    const req = createRequest('Bearer valid-token');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-123',
      type: 'access',
    });

    authMiddleware(req, res, next);

    expect((req as AuthenticatedRequest).userId).toBe('user-123');

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('valid-token');
  });

  it('calls next exactly once for a valid access token', () => {
    const req = createRequest('Bearer valid-token');
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-123',
      type: 'access',
    });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
