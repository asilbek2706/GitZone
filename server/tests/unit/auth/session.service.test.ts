import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';
import {
  getActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from '../../../src/services/auth/session.service.js';
import { hashRefreshToken } from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  hashRefreshToken: vi.fn(),
}));

const mockedSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockedSessionFindMany = vi.mocked(prisma.session.findMany);
const mockedSessionUpdateMany = vi.mocked(prisma.session.updateMany);
const mockedHashRefreshToken = vi.mocked(hashRefreshToken);

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

describe('session service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHashRefreshToken.mockReturnValue('refresh-hash');
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
});
