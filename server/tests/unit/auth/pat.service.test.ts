import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';

import {
  createPersonalAccessToken,
  getPersonalAccessTokens,
  revokePersonalAccessToken,
  verifyPersonalAccessToken,
} from '../../../src/services/auth/pat.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    personalAccessToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockedPatCreate = vi.mocked(prisma.personalAccessToken.create);

const mockedPatFindMany = vi.mocked(prisma.personalAccessToken.findMany);

const mockedPatFindUnique = vi.mocked(prisma.personalAccessToken.findUnique);

const mockedPatUpdate = vi.mocked(prisma.personalAccessToken.update);

const mockedPatDeleteMany = vi.mocked(prisma.personalAccessToken.deleteMany);

describe('personal access token service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a personal access token', async () => {
    const createdAt = new Date();

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Laptop token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt: null,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Laptop token');

    expect(result.id).toBe('pat-1');
    expect(result.name).toBe('Laptop token');

    expect(result.token).toMatch(/^gzp_/);

    expect(result.expiresAt).toBeNull();

    expect(mockedPatCreate).toHaveBeenCalledOnce();
  });

  it('rejects verification when username does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(
      verifyPersonalAccessToken('missing-user', 'gzp_invalid-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue(null as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token hash is invalid', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: 'gzp_invalid',
      tokenHash: 'wrong-hash',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token belongs to another user', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-token-for-owner-check';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-2',
      name: 'Test token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects expired personal access token', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-expired-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expired token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'GIT_TOKEN_EXPIRED',
    });
  });

  it('verifies valid personal access token and updates lastUsedAt', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-valid-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Valid token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    mockedPatUpdate.mockResolvedValue({} as never);

    const result = await verifyPersonalAccessToken('testuser', token);

    expect(result).toEqual({
      userId: 'user-1',
      username: 'testuser',
    });

    expect(mockedPatUpdate).toHaveBeenCalledOnce();

    expect(mockedPatUpdate).toHaveBeenCalledWith({
      where: {
        id: 'pat-1',
      },
      data: {
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('stores only token prefix and hash when creating a personal access token', async () => {
    const createdAt = new Date();

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Laptop token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt: null,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Laptop token');

    expect(result.token).toMatch(/^gzp_/);

    expect(mockedPatCreate).toHaveBeenCalledOnce();

    expect(mockedPatCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Laptop token',
        tokenPrefix: expect.stringMatching(/^gzp_/),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: null,
      },
    });

    const createCall = mockedPatCreate.mock.calls[0];

    expect(createCall).toBeDefined();
    expect(createCall?.[0].data).not.toHaveProperty('token');
  });

  it('stores the provided expiration date when creating a personal access token', async () => {
    const createdAt = new Date();
    const expiresAt = new Date('2026-10-01T12:00:00.000Z');

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expiring token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Expiring token', expiresAt);

    expect(result.expiresAt).toEqual(expiresAt);

    expect(mockedPatCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Expiring token',
        tokenPrefix: expect.any(String),
        tokenHash: expect.any(String),
        expiresAt,
      },
    });
  });

  it('does not update lastUsedAt when token hash is invalid', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: 'gzp_invalid',
      tokenHash: 'wrong-hash',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('does not update lastUsedAt when token belongs to another user', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_other-user-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-2',
      name: 'Other user token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('does not update lastUsedAt when personal access token is expired', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_expired-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expired token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'GIT_TOKEN_EXPIRED',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('rejects a personal access token that expires at the current time', async () => {
    const now = new Date('2026-09-13T07:30:00.000Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      mockedUserFindUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      } as never);

      const token = 'gzp_boundary-expired-token';

      const crypto = await import('node:crypto');

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockedPatFindUnique.mockResolvedValue({
        id: 'pat-1',
        userId: 'user-1',
        name: 'Boundary token',
        tokenPrefix: token.slice(0, 12),
        tokenHash,
        expiresAt: now,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
        statusCode: 401,
        code: 'GIT_TOKEN_EXPIRED',
      });

      expect(mockedPatUpdate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a token with the same-length but different hash', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_valid-looking-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const differentHash =
      tokenHash[0] === 'a' ? `b${tokenHash.slice(1)}` : `a${tokenHash.slice(1)}`;

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: token.slice(0, 12),
      tokenHash: differentHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('returns only safe personal access token fields for a user', async () => {
    const createdAt = new Date('2026-09-13T08:00:00.000Z');
    const lastUsedAt = new Date('2026-09-13T09:00:00.000Z');

    const tokens = [
      {
        id: 'pat-1',
        name: 'Laptop token',
        tokenPrefix: 'gzp_example',
        expiresAt: null,
        lastUsedAt,
        createdAt,
      },
    ];

    mockedPatFindMany.mockResolvedValue(tokens as never);

    const result = await getPersonalAccessTokens('user-1');

    expect(result).toEqual(tokens);

    expect(mockedPatFindMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result[0]).not.toHaveProperty('tokenHash');
    expect(result[0]).not.toHaveProperty('token');
  });

  it('revokes a personal access token owned by the user', async () => {
    mockedPatDeleteMany.mockResolvedValue({
      count: 1,
    });

    await revokePersonalAccessToken('user-1', 'pat-1');

    expect(mockedPatDeleteMany).toHaveBeenCalledWith({
      where: {
        id: 'pat-1',
        userId: 'user-1',
      },
    });
  });

  it('rejects revoking a personal access token that does not belong to the user', async () => {
    mockedPatDeleteMany.mockResolvedValue({
      count: 0,
    });

    await expect(revokePersonalAccessToken('user-1', 'pat-2')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PERSONAL_ACCESS_TOKEN_NOT_FOUND',
    });

    expect(mockedPatDeleteMany).toHaveBeenCalledWith({
      where: {
        id: 'pat-2',
        userId: 'user-1',
      },
    });
  });
});
