import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';
import { refreshAuth } from '../../../src/services/auth/refresh.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockedSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockedSessionUpdateMany = vi.mocked(prisma.session.updateMany);
const mockedTransaction = vi.mocked(prisma.$transaction);

const mockedGenerateAccessToken = vi.mocked(generateAccessToken);
const mockedGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockedHashRefreshToken = vi.mocked(hashRefreshToken);
const mockedVerifyRefreshToken = vi.mocked(verifyRefreshToken);

const baseUser = {
  id: 'user-1',
  username: 'asil',
  email: 'asil@example.com',
  password: 'hashed-password',
  name: 'Asil',
  avatarUrl: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sessionMetadata = {
  userAgent: 'Mozilla/5.0 GitZone Test',
  ipAddress: '127.0.0.1',
};

const createSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  userId: 'user-1',

  refreshTokenHash: 'refresh-hash',
  refreshTokenJti: 'refresh-jti',
  tokenFamilyId: 'family-1',

  parentSessionId: null,
  replacedById: null,

  userAgent: sessionMetadata.userAgent,
  ipAddress: sessionMetadata.ipAddress,

  lastUsedAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),

  revokedAt: null,
  rotatedAt: null,
  reuseDetectedAt: null,

  createdAt: new Date(),
  updatedAt: new Date(),

  ...overrides,
});

describe('refresh service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGenerateAccessToken.mockReturnValue('access-token');

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
      jti: 'refresh-jti',
    });

    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      jti: 'refresh-jti',
      type: 'refresh',
    });

    mockedHashRefreshToken.mockReturnValue('refresh-hash');
  });

  it('rejects refresh when session does not exist', async () => {
    mockedSessionFindUnique.mockResolvedValue(null as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('rejects revoked refresh token without treating normal revocation as replay', async () => {
    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        revokedAt: new Date(),
      }) as never,
    );

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REVOKED',
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('rejects expired refresh token', async () => {
    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        expiresAt: new Date(Date.now() - 60_000),
      }) as never,
    );

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_EXPIRED',
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('rejects refresh token when subject does not match session user', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'other-user',
      jti: 'refresh-jti',
      type: 'refresh',
    });

    mockedSessionFindUnique.mockResolvedValue(createSession() as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('rejects refresh token when JWT jti does not match the stored session jti', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      jti: 'attacker-jti',
      type: 'refresh',
    });

    mockedSessionFindUnique.mockResolvedValue(createSession() as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('rejects refresh when the session user no longer exists', async () => {
    mockedSessionFindUnique.mockResolvedValue(createSession() as never);

    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'USER_NOT_FOUND',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });
  it('refreshes authentication successfully with atomic token rotation', async () => {
    mockedSessionFindUnique.mockResolvedValue(createSession() as never);

    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'new-refresh-token',
      tokenHash: 'new-refresh-hash',
      jti: 'new-refresh-jti',
    });

    const txSessionUpdateMany = vi.fn().mockResolvedValue({
      count: 1,
    });

    const txSessionCreate = vi.fn().mockResolvedValue({
      id: 'session-2',
    });

    const txSessionUpdate = vi.fn().mockResolvedValue({});

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction');
      }

      return callback({
        session: {
          updateMany: txSessionUpdateMany,
          create: txSessionCreate,
          update: txSessionUpdate,
        },
      } as never);
    });

    const result = await refreshAuth('refresh-token', sessionMetadata);

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('new-refresh-token');

    expect(txSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        revokedAt: null,
        rotatedAt: null,
        replacedById: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        revokedAt: expect.any(Date),
        rotatedAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      },
    });

    expect(txSessionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        refreshTokenHash: 'new-refresh-hash',
        refreshTokenJti: 'new-refresh-jti',
        tokenFamilyId: 'family-1',
        parentSessionId: 'session-1',
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
        lastUsedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      },
    });

    expect(txSessionUpdate).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
      },
      data: {
        replacedById: 'session-2',
      },
    });

    expect(mockedTransaction).toHaveBeenCalledOnce();
  });
  it('accepts a legacy session jti during its first migration refresh', async () => {
    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        refreshTokenJti: 'legacy:session-1',
        tokenFamilyId: 'legacy:session-1',
      }) as never,
    );

    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'new-refresh-token',
      tokenHash: 'new-refresh-hash',
      jti: 'new-refresh-jti',
    });

    const txSessionUpdateMany = vi.fn().mockResolvedValue({
      count: 1,
    });

    const txSessionCreate = vi.fn().mockResolvedValue({
      id: 'session-2',
    });

    const txSessionUpdate = vi.fn().mockResolvedValue({});

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction');
      }

      return callback({
        session: {
          updateMany: txSessionUpdateMany,
          create: txSessionCreate,
          update: txSessionUpdate,
        },
      } as never);
    });

    const result = await refreshAuth('refresh-token', sessionMetadata);

    expect(result.refreshToken).toBe('new-refresh-token');

    expect(txSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        refreshTokenHash: 'new-refresh-hash',
        refreshTokenJti: 'new-refresh-jti',
        tokenFamilyId: 'legacy:session-1',
        parentSessionId: 'session-1',
      }),
    });
  });
  it('detects reuse of an already rotated refresh token and revokes its token family', async () => {
    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        revokedAt: new Date(),
        rotatedAt: new Date(),
        replacedById: 'session-2',
      }) as never,
    );

    mockedSessionUpdateMany
      .mockResolvedValueOnce({
        count: 1,
      } as never)
      .mockResolvedValueOnce({
        count: 1,
      } as never);

    mockedTransaction.mockResolvedValue([] as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSE_DETECTED',
      message: 'Refresh token reuse detected',
    });

    expect(mockedSessionUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        tokenFamilyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });

    expect(mockedSessionUpdateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'session-1',
        reuseDetectedAt: null,
      },
      data: {
        reuseDetectedAt: expect.any(Date),
      },
    });

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).toHaveBeenCalledOnce();
  });
  it('treats a lost atomic rotation claim as refresh-token reuse', async () => {
    mockedSessionFindUnique.mockResolvedValue(createSession() as never);

    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'new-refresh-token',
      tokenHash: 'new-refresh-hash',
      jti: 'new-refresh-jti',
    });

    const txSessionUpdateMany = vi.fn().mockResolvedValue({
      count: 0,
    });

    mockedTransaction
      .mockImplementationOnce(async (callback) => {
        if (typeof callback !== 'function') {
          throw new Error('Expected interactive transaction');
        }

        return callback({
          session: {
            updateMany: txSessionUpdateMany,
          },
        } as never);
      })
      .mockResolvedValueOnce([] as never);

    mockedSessionUpdateMany
      .mockResolvedValueOnce({
        count: 1,
      } as never)
      .mockResolvedValueOnce({
        count: 1,
      } as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSE_DETECTED',
    });

    expect(txSessionUpdateMany).toHaveBeenCalledOnce();

    expect(mockedSessionUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        tokenFamilyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });

    expect(mockedSessionUpdateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'session-1',
        reuseDetectedAt: null,
      },
      data: {
        reuseDetectedAt: expect.any(Date),
      },
    });

    expect(mockedTransaction).toHaveBeenCalledTimes(2);
  });
});
