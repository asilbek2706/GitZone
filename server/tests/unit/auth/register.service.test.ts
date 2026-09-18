import { beforeEach, describe, expect, it, vi } from 'vitest';

import bcrypt from 'bcrypt';

import prisma from '../../../src/config/prisma.js';
import { registerUser } from '../../../src/services/auth/register.service.js';
import { generateAccessToken, generateRefreshToken } from '../../../src/utils/auth/tokens.js';

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
    },
  },
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

const mockedUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockedUserCreate = vi.mocked(prisma.user.create);
const mockedSessionCreate = vi.mocked(prisma.session.create);

const mockedBcryptHash = vi.mocked(bcrypt.hash);

const mockedGenerateAccessToken = vi.mocked(generateAccessToken);
const mockedGenerateRefreshToken = vi.mocked(generateRefreshToken);

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

describe('register service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGenerateAccessToken.mockReturnValue('access-token');

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
      jti: 'refresh-jti',
    });
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
});
