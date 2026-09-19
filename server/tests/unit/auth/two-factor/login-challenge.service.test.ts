import * as OTPAuth from 'otpauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Prisma } from '../../../../src/generated/prisma/client.js';
import prisma from '../../../../src/config/prisma.js';
import { issueAuthSession } from '../../../../src/services/auth/session-issuer.service.js';
import { verifyTwoFactorLoginChallenge } from '../../../../src/services/auth/two-factor/login-challenge.service.js';
import { hashTwoFactorChallengeToken } from '../../../../src/utils/auth/two-factor/challenge.js';
import { decryptTwoFactorSecret } from '../../../../src/utils/auth/two-factor/crypto.js';

const transactionUpdateMany = vi.fn();

vi.mock('../../../../src/config/prisma.js', () => ({
  default: {
    twoFactorChallenge: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/auth/two-factor/crypto.js', () => ({
  decryptTwoFactorSecret: vi.fn(),
}));

vi.mock('../../../../src/services/auth/session-issuer.service.js', () => ({
  issueAuthSession: vi.fn(),
}));

const mockedFindUnique = vi.mocked(prisma.twoFactorChallenge.findUnique);
const mockedUpdateMany = vi.mocked(prisma.twoFactorChallenge.updateMany);
const mockedTransaction = vi.mocked(prisma.$transaction);
const mockedDecryptTwoFactorSecret = vi.mocked(decryptTwoFactorSecret);
const mockedIssueAuthSession = vi.mocked(issueAuthSession);

const transactionClient = {
  twoFactorChallenge: {
    updateMany: transactionUpdateMany,
  },
} as unknown as Prisma.TransactionClient;

const SECRET = new OTPAuth.Secret({ size: 20 });

const metadata = {
  userAgent: 'Vitest',
  ipAddress: '127.0.0.1',
};

const user = {
  id: 'user-1',
  username: 'asilbek',
  email: 'asil@example.com',
  password: 'hashed-password',
  name: 'Asilbek',
  avatarUrl: null,
  bio: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  twoFactorAuthentication: {
    id: 'two-factor-1',
    userId: 'user-1',
    encryptedSecret: 'v1.encrypted-secret',
    enabledAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

const authResponse = {
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const createChallenge = (overrides: Record<string, unknown> = {}) => ({
  id: 'challenge-1',
  userId: 'user-1',
  tokenHash: hashTwoFactorChallengeToken('challenge-token'),
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  attemptCount: 0,
  createdAt: new Date(),
  user,
  ...overrides,
});

const createValidCode = (): string => {
  const totp = new OTPAuth.TOTP({
    issuer: 'GitZone',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: SECRET,
  });

  return totp.generate();
};

describe('two-factor login challenge service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionUpdateMany.mockReset();

    mockedDecryptTwoFactorSecret.mockReturnValue(SECRET.base32);

    mockedIssueAuthSession.mockResolvedValue(authResponse);

    mockedUpdateMany.mockResolvedValue({
      count: 1,
    });

    transactionUpdateMany.mockResolvedValue({
      count: 1,
    });

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction callback');
      }

      return callback(transactionClient);
    });
  });

  it('verifies a valid challenge and issues the session inside the transaction', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    const result = await verifyTwoFactorLoginChallenge(
      'challenge-token',
      createValidCode(),
      metadata,
    );

    expect(result).toEqual(authResponse);

    expect(mockedDecryptTwoFactorSecret).toHaveBeenCalledWith('v1.encrypted-secret');

    expect(mockedTransaction).toHaveBeenCalledOnce();

    expect(transactionUpdateMany).toHaveBeenCalledOnce();
    expect(transactionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'challenge-1',
        tokenHash: hashTwoFactorChallengeToken('challenge-token'),
        usedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
        attemptCount: {
          lt: 5,
        },
      },
      data: {
        usedAt: expect.any(Date),
      },
    });

    expect(mockedIssueAuthSession).toHaveBeenCalledOnce();
    expect(mockedIssueAuthSession).toHaveBeenCalledWith(user, metadata, transactionClient);

    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown challenge token', async () => {
    mockedFindUnique.mockResolvedValue(null);

    await expect(
      verifyTwoFactorLoginChallenge('unknown-challenge', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects an expired challenge', async () => {
    mockedFindUnique.mockResolvedValue(
      createChallenge({
        expiresAt: new Date(Date.now() - 60_000),
      }) as never,
    );

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects an already used challenge', async () => {
    mockedFindUnique.mockResolvedValue(
      createChallenge({
        usedAt: new Date(),
      }) as never,
    );

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects a challenge that reached the maximum number of attempts', async () => {
    mockedFindUnique.mockResolvedValue(
      createChallenge({
        attemptCount: 5,
      }) as never,
    );

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects a challenge when two-factor authentication is not enabled', async () => {
    mockedFindUnique.mockResolvedValue(
      createChallenge({
        user: {
          ...user,
          twoFactorAuthentication: {
            ...user.twoFactorAuthentication,
            enabledAt: null,
          },
        },
      }) as never,
    );

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('fails safely when the encrypted TOTP secret cannot be decrypted', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    mockedDecryptTwoFactorSecret.mockImplementation(() => {
      throw new Error('decryption failed');
    });

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'TWO_FACTOR_SECRET_INVALID',
    });

    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('increments the attempt count when the TOTP code is invalid', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    const validCode = createValidCode();
    const invalidCode = validCode === '000000' ? '999999' : '000000';

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', invalidCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CODE',
    });

    expect(mockedUpdateMany).toHaveBeenCalledOnce();

    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'challenge-1',
        tokenHash: hashTwoFactorChallengeToken('challenge-token'),
        usedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
        attemptCount: {
          lt: 5,
        },
      },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects an invalid-code request when the atomic attempt claim is lost', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    mockedUpdateMany.mockResolvedValue({
      count: 0,
    });

    const validCode = createValidCode();
    const invalidCode = validCode === '000000' ? '999999' : '000000';

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', invalidCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('does not issue a session when the transactional challenge consume claim is lost', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    transactionUpdateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedTransaction).toHaveBeenCalledOnce();
    expect(transactionUpdateMany).toHaveBeenCalledOnce();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('propagates session issuance failure from the transaction', async () => {
    mockedFindUnique.mockResolvedValue(createChallenge() as never);

    const sessionError = new Error('session creation failed');

    mockedIssueAuthSession.mockRejectedValueOnce(sessionError);

    await expect(
      verifyTwoFactorLoginChallenge('challenge-token', createValidCode(), metadata),
    ).rejects.toBe(sessionError);

    expect(mockedTransaction).toHaveBeenCalledOnce();
    expect(transactionUpdateMany).toHaveBeenCalledOnce();

    expect(mockedIssueAuthSession).toHaveBeenCalledOnce();
    expect(mockedIssueAuthSession).toHaveBeenCalledWith(user, metadata, transactionClient);
  });
});
