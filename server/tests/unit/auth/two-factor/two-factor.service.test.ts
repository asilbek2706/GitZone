import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../../src/config/prisma.js';

import { encryptTwoFactorSecret } from '../../../../src/utils/auth/two-factor/crypto.js';

import { setupTwoFactorAuthentication } from '../../../../src/services/auth/two-factor/two-factor.service.js';

vi.mock('../../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    twoFactorAuthentication: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/utils/auth/two-factor/crypto.js', () => ({
  encryptTwoFactorSecret: vi.fn(),
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockedTwoFactorUpsert = vi.mocked(prisma.twoFactorAuthentication.upsert);

const mockedEncryptTwoFactorSecret = vi.mocked(encryptTwoFactorSecret);

describe('two-factor authentication service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedEncryptTwoFactorSecret.mockReturnValue('v1.encrypted-two-factor-secret');

    mockedTwoFactorUpsert.mockResolvedValue({} as never);
  });

  it('creates a new pending two-factor authentication setup', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'asil@example.com',
      twoFactorAuthentication: null,
    } as never);

    const result = await setupTwoFactorAuthentication('user-1');

    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.secret.length).toBeGreaterThan(0);

    expect(result.provisioningUri).toMatch(/^otpauth:\/\/totp\//);

    expect(result.provisioningUri).toContain('GitZone');
    expect(result.provisioningUri).toContain('asil%40example.com');

    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    expect(mockedEncryptTwoFactorSecret).toHaveBeenCalledOnce();

    expect(mockedEncryptTwoFactorSecret).toHaveBeenCalledWith(result.secret);

    expect(mockedTwoFactorUpsert).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      create: {
        userId: 'user-1',
        encryptedSecret: 'v1.encrypted-two-factor-secret',
        enabledAt: null,
      },
      update: {
        encryptedSecret: 'v1.encrypted-two-factor-secret',
        enabledAt: null,
      },
    });
  });

  it('does not store the plaintext TOTP secret in the database', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'asil@example.com',
      twoFactorAuthentication: null,
    } as never);

    const result = await setupTwoFactorAuthentication('user-1');

    expect(mockedTwoFactorUpsert).toHaveBeenCalledOnce();

    const upsertArgument = mockedTwoFactorUpsert.mock.calls[0]?.[0];

    expect(upsertArgument).toBeDefined();

    expect(upsertArgument?.create.encryptedSecret).not.toBe(result.secret);

    expect(upsertArgument?.update.encryptedSecret).not.toBe(result.secret);

    expect(upsertArgument?.create.encryptedSecret).toBe('v1.encrypted-two-factor-secret');

    expect(upsertArgument?.update.encryptedSecret).toBe('v1.encrypted-two-factor-secret');
  });

  it('replaces an existing pending setup with a new secret', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'asil@example.com',
      twoFactorAuthentication: {
        enabledAt: null,
      },
    } as never);

    const result = await setupTwoFactorAuthentication('user-1');

    expect(result.secret).toMatch(/^[A-Z2-7]+$/);

    expect(mockedEncryptTwoFactorSecret).toHaveBeenCalledWith(result.secret);

    expect(mockedTwoFactorUpsert).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      create: {
        userId: 'user-1',
        encryptedSecret: 'v1.encrypted-two-factor-secret',
        enabledAt: null,
      },
      update: {
        encryptedSecret: 'v1.encrypted-two-factor-secret',
        enabledAt: null,
      },
    });
  });

  it('rejects setup when the user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(setupTwoFactorAuthentication('missing-user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });

    expect(mockedEncryptTwoFactorSecret).not.toHaveBeenCalled();

    expect(mockedTwoFactorUpsert).not.toHaveBeenCalled();
  });

  it('rejects setup when two-factor authentication is already enabled', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'asil@example.com',
      twoFactorAuthentication: {
        enabledAt: new Date(),
      },
    } as never);

    await expect(setupTwoFactorAuthentication('user-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'TWO_FACTOR_ALREADY_ENABLED',
    });

    expect(mockedEncryptTwoFactorSecret).not.toHaveBeenCalled();

    expect(mockedTwoFactorUpsert).not.toHaveBeenCalled();
  });

  it('generates a different secret for separate setup attempts', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'asil@example.com',
      twoFactorAuthentication: null,
    } as never);

    const first = await setupTwoFactorAuthentication('user-1');

    const second = await setupTwoFactorAuthentication('user-1');

    expect(first.secret).not.toBe(second.secret);
    expect(first.provisioningUri).not.toBe(second.provisioningUri);
  });
});
