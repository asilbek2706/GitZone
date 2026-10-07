import type { NextFunction, Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  optionalAuthMiddleware,
  type OptionalAuthenticatedRequest,
} from '../../../src/middleware/optional-auth.middleware.js';
import { verifyAccessToken } from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  verifyAccessToken: vi.fn(),
}));

const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const createRequest = (authorization?: string): Request =>
  ({
    headers:
      authorization === undefined
        ? {}
        : {
            authorization,
          },
  }) as Request;

describe('optionalAuthMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows anonymous requests', () => {
    const req = createRequest();

    const next = vi.fn() as NextFunction;

    optionalAuthMiddleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization header', () => {
    const req = createRequest('Basic token');

    expect(() => optionalAuthMiddleware(req, {} as Response, vi.fn())).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_AUTHORIZATION_HEADER',
      }),
    );
  });

  it('rejects invalid access token', () => {
    mockedVerifyAccessToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const req = createRequest('Bearer bad-token');

    expect(() => optionalAuthMiddleware(req, {} as Response, vi.fn())).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_ACCESS_TOKEN',
      }),
    );
  });

  it('sets userId for valid access token', () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
      type: 'access',
    });

    const req = createRequest('Bearer valid-token');

    const next = vi.fn() as NextFunction;

    optionalAuthMiddleware(req, {} as Response, next);

    expect((req as OptionalAuthenticatedRequest).userId).toBe('user-1');

    expect(next).toHaveBeenCalledOnce();
  });
});
