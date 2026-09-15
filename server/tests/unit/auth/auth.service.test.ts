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

const mockedSessionUpdate = vi.mocked(prisma.session.update);

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

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGenerateAccessToken.mockReturnValue('access-token');

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
    } as never);

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

    expect(mockedSessionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
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
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue(null as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects revoked refresh token', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REVOKED',
    });
  });

  it('rejects expired refresh token', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_EXPIRED',
    });
  });

  it('rejects refresh token when subject does not match session user', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'other-user',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token', sessionMetadata)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('refreshes authentication successfully', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedSessionUpdate.mockReturnValue({} as never);

    mockedSessionCreate.mockReturnValue({} as never);

    mockedTransaction.mockResolvedValue([] as never);

    const result = await refreshAuth('refresh-token', sessionMetadata);

    expect(result.user.id).toBe('user-1');

    expect(result.accessToken).toBe('access-token');

    expect(result.refreshToken).toBe('refresh-token');

    expect(mockedSessionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
        lastUsedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      },
    });

    expect(mockedTransaction).toHaveBeenCalledOnce();
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

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'current-refresh-hash',
      userAgent: 'Chrome',
      ipAddress: '127.0.0.1',
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

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

    expect(mockedSessionFindUnique).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: 'current-refresh-hash',
      },
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session belongs to another user', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'other-user',
      refreshTokenHash: 'current-refresh-hash',
      userAgent: 'Chrome',
      ipAddress: '127.0.0.1',
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session is revoked', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'current-refresh-hash',
      userAgent: 'Chrome',
      ipAddress: '127.0.0.1',
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(revokeOtherSessions('user-1', 'current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Current refresh session is invalid',
    });

    expect(mockedSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking other sessions when the current refresh session is expired', async () => {
    mockedHashRefreshToken.mockReturnValue('current-refresh-hash');

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'current-refresh-hash',
      userAgent: 'Chrome',
      ipAddress: '127.0.0.1',
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

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

    expect(mockedSessionUpdateMany).toHaveBeenCalledOnce();
  });
});
