import * as OTPAuth from 'otpauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../../src/config/prisma.js';
import { decryptTwoFactorSecret } from '../../../../src/modules/auth/two-factor/two-factor.crypto.js';
import { generateRecoveryCodes } from '../../../../src/modules/auth/two-factor/recovery-code.js';
import { verifyTwoFactorSetup } from '../../../../src/modules/auth/two-factor/two-factor.service.js';

vi.mock('../../../../src/config/prisma.js', () => ({
  default: {
    twoFactorAuthentication: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/auth/two-factor/two-factor.crypto.js', () => ({
  decryptTwoFactorSecret: vi.fn(),
  encryptTwoFactorSecret: vi.fn(),
}));

vi.mock('../../../../src/modules/auth/two-factor/recovery-code.js', () => ({
  generateRecoveryCodes: vi.fn(),
}));

const mockedFindUnique = vi.mocked(prisma.twoFactorAuthentication.findUnique);

const mockedTransaction = vi.mocked(prisma.$transaction);

const mockedDecryptTwoFactorSecret = vi.mocked(decryptTwoFactorSecret);

const mockedGenerateRecoveryCodes = vi.mocked(generateRecoveryCodes);

const SECRET = new OTPAuth.Secret({ size: 20 });

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

const recoveryCodes = [
  {
    code: '11111111111111111111111111111111',
    codeHash: 'hash-1',
  },
  {
    code: '22222222222222222222222222222222',
    codeHash: 'hash-2',
  },
];

describe('two-factor setup verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedDecryptTwoFactorSecret.mockReturnValue(SECRET.base32);

    mockedGenerateRecoveryCodes.mockReturnValue(recoveryCodes);

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction');
      }

      const tx = {
        twoFactorAuthentication: {
          updateMany: vi.fn().mockResolvedValue({
            count: 1,
          }),
        },
        recoveryCode: {
          deleteMany: vi.fn().mockResolvedValue({
            count: 0,
          }),
          createMany: vi.fn().mockResolvedValue({
            count: recoveryCodes.length,
          }),
        },
      };

      return callback(tx as never);
    });
  });

  it('verifies a valid TOTP code and returns plaintext recovery codes', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'v1.encrypted-secret',
      enabledAt: null,
    } as never);

    const result = await verifyTwoFactorSetup('user-1', createValidCode());

    expect(result).toEqual({
      recoveryCodes: recoveryCodes.map(({ code }) => code),
    });

    expect(mockedDecryptTwoFactorSecret).toHaveBeenCalledWith('v1.encrypted-secret');

    expect(mockedGenerateRecoveryCodes).toHaveBeenCalledOnce();

    expect(mockedTransaction).toHaveBeenCalledOnce();
  });

  it('rejects verification when setup does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    await expect(verifyTwoFactorSetup('user-1', '123456')).rejects.toMatchObject({
      statusCode: 404,
      code: 'TWO_FACTOR_SETUP_NOT_FOUND',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedGenerateRecoveryCodes).not.toHaveBeenCalled();
  });

  it('rejects verification when two-factor authentication is already enabled', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'v1.encrypted-secret',
      enabledAt: new Date(),
    } as never);

    await expect(verifyTwoFactorSetup('user-1', '123456')).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_ALREADY_ENABLED',
    });

    expect(mockedDecryptTwoFactorSecret).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid TOTP code without modifying the database', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'v1.encrypted-secret',
      enabledAt: null,
    } as never);

    const validCode = createValidCode();

    const invalidCode = validCode === '000000' ? '999999' : '000000';

    await expect(verifyTwoFactorSetup('user-1', invalidCode)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TWO_FACTOR_CODE',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedGenerateRecoveryCodes).not.toHaveBeenCalled();
  });

  it('fails safely when the encrypted TOTP secret cannot be decrypted', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'invalid-encrypted-secret',
      enabledAt: null,
    } as never);

    mockedDecryptTwoFactorSecret.mockImplementation(() => {
      throw new Error('decryption failed');
    });

    await expect(verifyTwoFactorSetup('user-1', '123456')).rejects.toMatchObject({
      statusCode: 500,
      code: 'TWO_FACTOR_SECRET_INVALID',
    });

    expect(mockedTransaction).not.toHaveBeenCalled();
    expect(mockedGenerateRecoveryCodes).not.toHaveBeenCalled();
  });

  it('rejects a concurrent verification that loses the atomic enable claim', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'v1.encrypted-secret',
      enabledAt: null,
    } as never);

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction');
      }

      const tx = {
        twoFactorAuthentication: {
          updateMany: vi.fn().mockResolvedValue({
            count: 0,
          }),
        },
        recoveryCode: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      };

      return callback(tx as never);
    });

    await expect(verifyTwoFactorSetup('user-1', createValidCode())).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_SETUP_ALREADY_COMPLETED',
    });
  });

  it('stores only recovery-code hashes inside the transaction', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'two-factor-1',
      encryptedSecret: 'v1.encrypted-secret',
      enabledAt: null,
    } as never);

    const updateMany = vi.fn().mockResolvedValue({
      count: 1,
    });

    const deleteMany = vi.fn().mockResolvedValue({
      count: 0,
    });

    const createMany = vi.fn().mockResolvedValue({
      count: recoveryCodes.length,
    });

    mockedTransaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected interactive transaction');
      }

      return callback({
        twoFactorAuthentication: {
          updateMany,
        },
        recoveryCode: {
          deleteMany,
          createMany,
        },
      } as never);
    });

    await verifyTwoFactorSetup('user-1', createValidCode());

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'two-factor-1',
        userId: 'user-1',
        enabledAt: null,
      },
      data: {
        enabledAt: expect.any(Date),
      },
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          codeHash: 'hash-1',
        },
        {
          userId: 'user-1',
          codeHash: 'hash-2',
        },
      ],
    });

    const serializedCreateMany = JSON.stringify(createMany.mock.calls);

    for (const { code } of recoveryCodes) {
      expect(serializedCreateMany).not.toContain(code);
    }
  });
});
