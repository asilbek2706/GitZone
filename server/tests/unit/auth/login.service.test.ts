import { beforeEach, describe, expect, it, vi } from 'vitest';

import bcrypt from 'bcrypt';

import prisma from '../../../src/config/prisma.js';
import { loginUser } from '../../../src/services/auth/login.service.js';
import { generateAccessToken, generateRefreshToken } from '../../../src/utils/auth/tokens.js';
import { generateTwoFactorChallengeToken } from '../../../src/utils/auth/two-factor/challenge.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    twoFactorChallenge: {
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

vi.mock('../../../src/utils/auth/two-factor/challenge.js', () => ({
  generateTwoFactorChallengeToken: vi.fn(),
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockedTwoFactorChallengeCreate = vi.mocked(prisma.twoFactorChallenge.create);
const mockedSessionCreate = vi.mocked(prisma.session.create);

const mockedBcryptCompare = vi.mocked(bcrypt.compare);

const mockedGenerateAccessToken = vi.mocked(generateAccessToken);
const mockedGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockedGenerateTwoFactorChallengeToken = vi.mocked(generateTwoFactorChallengeToken);

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

describe('login service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGenerateAccessToken.mockReturnValue('access-token');

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
      jti: 'refresh-jti',
    });

    mockedGenerateTwoFactorChallengeToken.mockReturnValue({
      token: 'two-factor-challenge-token',
      tokenHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      expiresAt: new Date('2026-09-18T06:00:00.000Z'),
    });
  });

  it('logs in user with valid credentials when two-factor authentication is disabled', async () => {
    mockedUserFindUnique.mockResolvedValue({
      ...baseUser,
      twoFactorAuthentication: null,
    } as never);

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await loginUser(
      {
        email: 'asil@example.com',
        password: 'password123',
      },
      sessionMetadata,
    );

    expect(result.requiresTwoFactor).toBe(false);

    if (result.requiresTwoFactor) {
      throw new Error('Expected authenticated login response');
    }

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

    expect(mockedGenerateAccessToken).toHaveBeenCalledWith('user-1');
    expect(mockedGenerateRefreshToken).toHaveBeenCalledWith('user-1');

    expect(mockedGenerateTwoFactorChallengeToken).not.toHaveBeenCalled();

    expect(mockedTwoFactorChallengeCreate).not.toHaveBeenCalled();
  });
  it('allows normal login while two-factor authentication setup is pending', async () => {
    mockedUserFindUnique.mockResolvedValue({
      ...baseUser,
      twoFactorAuthentication: {
        enabledAt: null,
      },
    } as never);

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await loginUser(
      {
        email: 'asil@example.com',
        password: 'password123',
      },
      sessionMetadata,
    );

    expect(result.requiresTwoFactor).toBe(false);

    if (result.requiresTwoFactor) {
      throw new Error('Expected authenticated login response');
    }

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');

    expect(mockedSessionCreate).toHaveBeenCalledTimes(1);

    expect(mockedGenerateAccessToken).toHaveBeenCalledWith('user-1');

    expect(mockedGenerateRefreshToken).toHaveBeenCalledWith('user-1');

    expect(mockedGenerateTwoFactorChallengeToken).not.toHaveBeenCalled();

    expect(mockedTwoFactorChallengeCreate).not.toHaveBeenCalled();
  });
  it('creates a two-factor challenge without issuing authenticated credentials when two-factor authentication is enabled', async () => {
    const enabledAt = new Date('2026-09-18T05:00:00.000Z');

    const expiresAt = new Date('2026-09-18T06:00:00.000Z');

    mockedUserFindUnique.mockResolvedValue({
      ...baseUser,
      twoFactorAuthentication: {
        enabledAt,
      },
    } as never);

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockedGenerateTwoFactorChallengeToken.mockReturnValue({
      token: 'two-factor-challenge-token',
      tokenHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      expiresAt,
    });

    mockedTwoFactorChallengeCreate.mockResolvedValue({} as never);

    const result = await loginUser(
      {
        email: 'asil@example.com',
        password: 'password123',
      },
      sessionMetadata,
    );

    expect(result).toEqual({
      requiresTwoFactor: true,
      challengeToken: 'two-factor-challenge-token',
      expiresAt,
    });

    expect(mockedGenerateTwoFactorChallengeToken).toHaveBeenCalledTimes(1);

    expect(mockedTwoFactorChallengeCreate).toHaveBeenCalledTimes(1);

    expect(mockedTwoFactorChallengeCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        expiresAt,
      },
    });

    expect(mockedTwoFactorChallengeCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: 'two-factor-challenge-token',
        }),
      }),
    );

    expect(mockedSessionCreate).not.toHaveBeenCalled();

    expect(mockedGenerateAccessToken).not.toHaveBeenCalled();

    expect(mockedGenerateRefreshToken).not.toHaveBeenCalled();
  });
  it('rejects login when user does not exist without creating authentication credentials or a challenge', async () => {
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

    expect(mockedGenerateTwoFactorChallengeToken).not.toHaveBeenCalled();

    expect(mockedTwoFactorChallengeCreate).not.toHaveBeenCalled();

    expect(mockedGenerateAccessToken).not.toHaveBeenCalled();

    expect(mockedGenerateRefreshToken).not.toHaveBeenCalled();

    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });
  it('rejects login with invalid password without creating authentication credentials or a challenge', async () => {
    mockedUserFindUnique.mockResolvedValue({
      ...baseUser,
      twoFactorAuthentication: {
        enabledAt: new Date('2026-09-18T05:00:00.000Z'),
      },
    } as never);

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

    expect(mockedGenerateTwoFactorChallengeToken).not.toHaveBeenCalled();

    expect(mockedTwoFactorChallengeCreate).not.toHaveBeenCalled();

    expect(mockedGenerateAccessToken).not.toHaveBeenCalled();

    expect(mockedGenerateRefreshToken).not.toHaveBeenCalled();

    expect(mockedSessionCreate).not.toHaveBeenCalled();
  });
});
