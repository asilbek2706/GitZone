import { beforeEach, describe, expect, it, vi } from 'vitest';

import bcrypt from 'bcrypt';

import prisma from '../../../src/config/prisma.js';

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../../../src/modules/auth/auth.tokens.js';

import {
  getActiveSessions,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuth,
  registerUser,
  revokeOtherSessions,
  revokeSession,
} from '../../../src/modules/auth/auth.service.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../src/modules/auth/auth.tokens.js', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

const mockedUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockedUserCreate = vi.mocked(prisma.user.create);

const mockedSessionCreate = vi.mocked(prisma.session.create);
const mockedSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockedSessionFindMany = vi.mocked(prisma.session.findMany);
const mockedSessionUpdateMany = vi.mocked(prisma.session.updateMany);

const mockedTransaction = vi.mocked(prisma.$transaction);

const mockedBcryptHash = vi.mocked(bcrypt.hash);
const mockedBcryptCompare = vi.mocked(bcrypt.compare);

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

describe('auth service', () => {
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

  it('registers a new user', async () => {
    mockedUserFindFirst.mockResolvedValue(null as never);

    mockedBcryptHash.mockResolvedValue('hashed-password' as never);

    mockedUserCreate.mockResolvedValue(baseUser as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await registerUser(
      {
        username: 'asil',
        email: 'asil@example.com',
        password: 'password123',
        name: 'Asil',
      },
      sessionMetadata,
    );

    expect(result.user.username).toBe('asil');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');

    expect(mockedSessionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        refreshTokenJti: 'refresh-jti',
        tokenFamilyId: 'refresh-jti',
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
        lastUsedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      },
    });
  });

  it('rejects duplicate username', async () => {
    mockedUserFindFirst.mockResolvedValue(baseUser as never);

    await expect(
      registerUser(
        {
          username: 'asil',
          email: 'other@example.com',
          password: 'password123',
          name: 'Asil',
        },
        sessionMetadata,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_TAKEN',
    });

    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects duplicate email', async () => {
    mockedUserFindFirst.mockResolvedValue({
      ...baseUser,
      username: 'another-user',
    } as never);

    await expect(
      registerUser(
        {
          username: 'newuser',
          email: 'asil@example.com',
          password: 'password123',
          name: 'New User',
        },
        sessionMetadata,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
    });

    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });

  it('logs in user with valid credentials', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await loginUser(
      {
        email: 'asil@example.com',
        password: 'password123',
      },
      sessionMetadata,
    );

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');

    expect(mockedSessionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        refreshTokenJti: 'refresh-jti',
        tokenFamilyId: 'refresh-jti',
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
        lastUsedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      },
    });
  });

  it('rejects login when user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(
      loginUser(
        {
          email: 'missing@example.com',
          password: 'password123',
        },
        sessionMetadata,
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    expect(mockedBcryptCompare).not.toHaveBeenCalled();
    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects login with invalid password', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedBcryptCompare.mockResolvedValue(false as never);

    await expect(
      loginUser(
        {
          email: 'asil@example.com',
          password: 'wrong-password',
        },
        sessionMetadata,
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });

  it('returns current user', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    const result = await getCurrentUser('user-1');

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('asil@example.com');
  });

  it('throws 404 when current user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(getCurrentUser('missing-user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
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

  it('returns active sessions without exposing sensitive fields', async () => {
    const sessions = [
      {
        id: 'session-2',
        userAgent: 'Chrome',
        ipAddress: '127.0.0.1',
        lastUsedAt: new Date('2026-09-15T10:00:00.000Z'),
        expiresAt: new Date('2026-09-22T10:00:00.000Z'),
        createdAt: new Date('2026-09-15T09:00:00.000Z'),
      },
      {
        id: 'session-1',
        userAgent: 'Firefox',
        ipAddress: '127.0.0.2',
        lastUsedAt: new Date('2026-09-14T10:00:00.000Z'),
        expiresAt: new Date('2026-09-21T10:00:00.000Z'),
        createdAt: new Date('2026-09-14T09:00:00.000Z'),
      },
    ];

    mockedSessionFindMany.mockResolvedValue(sessions as never);

    const result = await getActiveSessions('user-1');

    expect(result).toEqual(sessions);

    expect(mockedSessionFindMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });
  });

  it('revokes an active session owned by the user', async () => {
    mockedSessionUpdateMany.mockResolvedValue({
      count: 1,
    } as never);

    await expect(revokeSession('user-1', 'session-1')).resolves.toBeUndefined();

    expect(mockedSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('rejects revoking a session that is not active or not owned by the user', async () => {
    mockedSessionUpdateMany.mockResolvedValue({
      count: 0,
    } as never);

    await expect(revokeSession('user-1', 'session-999')).rejects.toMatchObject({
      statusCode: 404,
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found',
    });

    expect(mockedSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-999',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('revokes all other active sessions while preserving the current session', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        refreshTokenHash: 'current-refresh-hash',
      }) as never,
    );

    mockedSessionUpdateMany.mockResolvedValue({
      count: 3,
    } as never);

    const result = await revokeOtherSessions('user-1', 'current-refresh-token');

    expect(result).toBe(3);

    expect(mockedHashRefreshToken).toHaveBeenCalledWith('current-refresh-token');

    expect(mockedSessionFindUnique).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: 'current-refresh-hash',
      },
    });

    expect(mockedSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
        id: {
          not: 'session-1',
        },
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('rejects revoking other sessions when the current refresh session is invalid', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue(null as never);

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session belongs to another user', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        userId: 'other-user',
        refreshTokenHash: 'current-refresh-hash',
      }) as never,
    );

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session is revoked', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        refreshTokenHash: 'current-refresh-hash',
        revokedAt: new Date(),
      }) as never,
    );

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session is expired', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue(
      createSession({
        refreshTokenHash: 'current-refresh-hash',
        expiresAt: new Date(Date.now() - 60_000),
      }) as never,
    );

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('logs out by revoking active refresh session', async () => {
    mockedSessionUpdateMany.mockResolvedValue({
      count: 1,
    } as never);

    await expect(logoutUser('refresh-token')).resolves.toBeUndefined();

    expect(mockedHashRefreshToken).toHaveBeenCalledWith('refresh-token');

    expect(mockedSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: 'refresh-hash',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
