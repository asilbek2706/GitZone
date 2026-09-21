import bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Prisma } from '../../../../src/generated/prisma/client.js';
import prisma from '../../../../src/config/prisma.js';
import { disableTwoFactorAuthentication } from '../../../../src/services/auth/two-factor/disable.service.js';
import { encryptTwoFactorSecret } from '../../../../src/utils/auth/two-factor/crypto.js';

const transactionTwoFactorDeleteMany = vi.fn();
const transactionRecoveryDeleteMany = vi.fn();
const transactionChallengeDeleteMany = vi.fn();

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('../../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('two-factor disable service', () => {
  const mockedFindUnique = vi.mocked(prisma.user.findUnique);
  const mockedTransaction = vi.mocked(prisma.$transaction);
  const mockedCompare = vi.mocked(bcrypt.compare);

  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  const encryptedSecret = encryptTwoFactorSecret(secret);

  const transactionClient = {
    twoFactorAuthentication: {
      deleteMany: transactionTwoFactorDeleteMany,
    },
    recoveryCode: {
      deleteMany: transactionRecoveryDeleteMany,
    },
    twoFactorChallenge: {
      deleteMany: transactionChallengeDeleteMany,
    },
  } as unknown as Prisma.TransactionClient;

  const createValidCode = (): string => {
    const totp = new OTPAuth.TOTP({
      issuer: 'GitZone',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    return totp.generate();
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedFindUnique.mockResolvedValue({
      password: 'hashed-password',
      twoFactorAuthentication: {
        id: 'two-factor-1',
        encryptedSecret,
        enabledAt: new Date(),
      },
    } as never);

    mockedCompare.mockResolvedValue(true as never);

    transactionTwoFactorDeleteMany.mockResolvedValue({ count: 1 });
    transactionRecoveryDeleteMany.mockResolvedValue({ count: 10 });
    transactionChallengeDeleteMany.mockResolvedValue({ count: 3 });

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction callback');
      }

      return callback(transactionClient);
    });
  });

  it('disables two-factor authentication and cleans related credentials atomically', async () => {
    const code = createValidCode();

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', code),
    ).resolves.toBeUndefined();

    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      select: {
        password: true,
        twoFactorAuthentication: {
          select: {
            id: true,
            encryptedSecret: true,
            enabledAt: true,
          },
        },
      },
    });

    expect(mockedCompare).toHaveBeenCalledWith('current-password', 'hashed-password');

    expect(mockedTransaction).toHaveBeenCalledTimes(1);

    expect(transactionTwoFactorDeleteMany).toHaveBeenCalledWith({
      where: {
        id: 'two-factor-1',
        userId: 'user-1',
        enabledAt: {
          not: null,
        },
      },
    });

    expect(transactionRecoveryDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });

    expect(transactionChallengeDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });
  });

  it('rejects when the user does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    await expect(
      disableTwoFactorAuthentication('missing-user', 'current-password', '123456'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });

    expect(mockedCompare).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid current password before checking two-factor credentials', async () => {
    mockedCompare.mockResolvedValue(false as never);

    await expect(
      disableTwoFactorAuthentication('user-1', 'wrong-password', '123456'),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CURRENT_PASSWORD',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when two-factor authentication is not configured', async () => {
    mockedFindUnique.mockResolvedValue({
      password: 'hashed-password',
      twoFactorAuthentication: null,
    } as never);

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', '123456'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_NOT_ENABLED',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when two-factor authentication exists but is not enabled', async () => {
    mockedFindUnique.mockResolvedValue({
      password: 'hashed-password',
      twoFactorAuthentication: {
        id: 'two-factor-1',
        encryptedSecret,
        enabledAt: null,
      },
    } as never);

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', '123456'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_NOT_ENABLED',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects a corrupted encrypted two-factor secret', async () => {
    mockedFindUnique.mockResolvedValue({
      password: 'hashed-password',
      twoFactorAuthentication: {
        id: 'two-factor-1',
        encryptedSecret: 'invalid-encrypted-secret',
        enabledAt: new Date(),
      },
    } as never);

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', '123456'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'TWO_FACTOR_SECRET_INVALID',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid two-factor authentication code', async () => {
    const validCode = createValidCode();
    const invalidCode = validCode === '000000' ? '999999' : '000000';

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', invalidCode),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CODE',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when another request disables two-factor authentication first', async () => {
    transactionTwoFactorDeleteMany.mockResolvedValue({ count: 0 });

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', createValidCode()),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_NOT_ENABLED',
    });

    expect(transactionRecoveryDeleteMany).not.toHaveBeenCalled();
    expect(transactionChallengeDeleteMany).not.toHaveBeenCalled();
  });

  it('propagates a transaction failure', async () => {
    transactionRecoveryDeleteMany.mockRejectedValue(new Error('database failure'));

    await expect(
      disableTwoFactorAuthentication('user-1', 'current-password', createValidCode()),
    ).rejects.toThrow('database failure');

    expect(transactionTwoFactorDeleteMany).toHaveBeenCalledTimes(1);
    expect(transactionRecoveryDeleteMany).toHaveBeenCalledTimes(1);
  });
});
