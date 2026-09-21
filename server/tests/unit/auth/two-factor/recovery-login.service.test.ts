import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Prisma } from '../../../../src/generated/prisma/client.js';
import prisma from '../../../../src/config/prisma.js';
import { issueAuthSession } from '../../../../src/services/auth/session-issuer.service.js';
import { verifyTwoFactorRecoveryLogin } from '../../../../src/services/auth/two-factor/recovery-login.service.js';
import type { AuthResponse, SessionMetadata } from '../../../../src/types/auth.types.js';
import { hashTwoFactorChallengeToken } from '../../../../src/utils/auth/two-factor/challenge.js';
import { hashRecoveryCode } from '../../../../src/utils/auth/two-factor/recovery-code.js';

const transactionRecoveryUpdateMany = vi.fn();
const transactionChallengeUpdateMany = vi.fn();

vi.mock('../../../../src/config/prisma.js', () => ({
  default: {
    twoFactorChallenge: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    recoveryCode: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../../src/services/auth/session-issuer.service.js', () => ({
  issueAuthSession: vi.fn(),
}));

const mockedFindChallenge = vi.mocked(prisma.twoFactorChallenge.findUnique);
const mockedChallengeUpdateMany = vi.mocked(prisma.twoFactorChallenge.updateMany);
const mockedFindRecoveryCode = vi.mocked(prisma.recoveryCode.findFirst);
const mockedTransaction = vi.mocked(prisma.$transaction);
const mockedIssueAuthSession = vi.mocked(issueAuthSession);

const challengeToken = 'recovery-login-challenge-token';
const recoveryCode = '0123456789abcdef0123456789abcdef';

const metadata: SessionMetadata = {
  userAgent: 'Vitest',
  ipAddress: '127.0.0.1',
};

const user = {
  id: 'user-1',
  username: 'asil',
  email: 'asil@example.com',
  name: 'Asil',
  avatarUrl: null,
  bio: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  twoFactorAuthentication: {
    id: '2fa-1',
    userId: 'user-1',
    encryptedSecret: 'encrypted-secret',
    enabledAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

const challenge = {
  id: 'challenge-1',
  userId: user.id,
  tokenHash: hashTwoFactorChallengeToken(challengeToken),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  usedAt: null,
  attemptCount: 0,
  createdAt: new Date(),
  user,
};

const storedRecoveryCode = {
  id: 'recovery-1',
};

const authResponse: AuthResponse = {
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

const transactionClient = {
  recoveryCode: {
    updateMany: transactionRecoveryUpdateMany,
  },
  twoFactorChallenge: {
    updateMany: transactionChallengeUpdateMany,
  },
} as unknown as Prisma.TransactionClient;

describe('two-factor recovery login service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    transactionRecoveryUpdateMany.mockReset();
    transactionChallengeUpdateMany.mockReset();

    mockedFindChallenge.mockResolvedValue(challenge as never);
    mockedFindRecoveryCode.mockResolvedValue(storedRecoveryCode as never);
    mockedChallengeUpdateMany.mockResolvedValue({ count: 1 });
    transactionRecoveryUpdateMany.mockResolvedValue({ count: 1 });
    transactionChallengeUpdateMany.mockResolvedValue({ count: 1 });
    mockedIssueAuthSession.mockResolvedValue(authResponse);

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction callback');
      }

      return callback(transactionClient);
    });
  });

  it('consumes the recovery code and challenge and issues a session inside one transaction', async () => {
    const result = await verifyTwoFactorRecoveryLogin(
      challengeToken,
      recoveryCode,
      metadata,
    );

    expect(result).toEqual(authResponse);

    expect(mockedFindChallenge).toHaveBeenCalledWith({
      where: {
        tokenHash: hashTwoFactorChallengeToken(challengeToken),
      },
      include: {
        user: {
          include: {
            twoFactorAuthentication: true,
          },
        },
      },
    });

    expect(mockedFindRecoveryCode).toHaveBeenCalledWith({
      where: {
        userId: user.id,
        codeHash: hashRecoveryCode(recoveryCode),
        usedAt: null,
      },
      select: {
        id: true,
      },
    });

    expect(transactionRecoveryUpdateMany).toHaveBeenCalledOnce();
    expect(transactionChallengeUpdateMany).toHaveBeenCalledOnce();

    expect(mockedIssueAuthSession).toHaveBeenCalledWith(
      user,
      metadata,
      transactionClient,
    );

    expect(mockedChallengeUpdateMany).not.toHaveBeenCalled();
  });

  it('accepts an uppercase recovery code through normalization', async () => {
    await verifyTwoFactorRecoveryLogin(
      challengeToken,
      recoveryCode.toUpperCase(),
      metadata,
    );

    expect(mockedFindRecoveryCode).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          codeHash: hashRecoveryCode(recoveryCode),
        }),
      }),
    );
  });

  it('rejects an unknown challenge token', async () => {
    mockedFindChallenge.mockResolvedValue(null);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedFindRecoveryCode).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects an expired challenge', async () => {
    mockedFindChallenge.mockResolvedValue({
      ...challenge,
      expiresAt: new Date(Date.now() - 1000),
    } as never);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedFindRecoveryCode).not.toHaveBeenCalled();
  });

  it('rejects an already used challenge', async () => {
    mockedFindChallenge.mockResolvedValue({
      ...challenge,
      usedAt: new Date(),
    } as never);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });
  });

  it('rejects a challenge that reached the maximum attempts', async () => {
    mockedFindChallenge.mockResolvedValue({
      ...challenge,
      attemptCount: 5,
    } as never);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedFindRecoveryCode).not.toHaveBeenCalled();
  });

  it('rejects recovery login when two-factor authentication is not enabled', async () => {
    mockedFindChallenge.mockResolvedValue({
      ...challenge,
      user: {
        ...user,
        twoFactorAuthentication: {
          ...user.twoFactorAuthentication,
          enabledAt: null,
        },
      },
    } as never);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedFindRecoveryCode).not.toHaveBeenCalled();
  });

  it('increments the challenge attempt count for an invalid recovery code', async () => {
    mockedFindRecoveryCode.mockResolvedValue(null);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_RECOVERY_CODE',
    });

    expect(mockedChallengeUpdateMany).toHaveBeenCalledWith({
      where: {
        id: challenge.id,
        tokenHash: challenge.tokenHash,
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

  it('rejects an invalid recovery code when the atomic attempt claim is lost', async () => {
    mockedFindRecoveryCode.mockResolvedValue(null);
    mockedChallengeUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when the recovery code transactional consume claim is lost', async () => {
    transactionRecoveryUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_RECOVERY_CODE',
    });

    expect(transactionChallengeUpdateMany).not.toHaveBeenCalled();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('rejects when the challenge transactional consume claim is lost', async () => {
    transactionChallengeUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CHALLENGE',
    });

    expect(transactionRecoveryUpdateMany).toHaveBeenCalledOnce();
    expect(mockedIssueAuthSession).not.toHaveBeenCalled();
  });

  it('propagates session issuance failure from the transaction', async () => {
    const sessionError = new Error('Session creation failed');
    mockedIssueAuthSession.mockRejectedValue(sessionError);

    await expect(
      verifyTwoFactorRecoveryLogin(challengeToken, recoveryCode, metadata),
    ).rejects.toBe(sessionError);

    expect(transactionRecoveryUpdateMany).toHaveBeenCalledOnce();
    expect(transactionChallengeUpdateMany).toHaveBeenCalledOnce();
    expect(mockedIssueAuthSession).toHaveBeenCalledOnce();
  });
});
