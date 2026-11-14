import { generateKeyPairSync } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';

import {
  createSshKey,
  getSshKeys,
  revokeSshKey,
} from '../../../src/services/auth/ssh-key.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    sshKey: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const mockedCreate = vi.mocked(prisma.sshKey.create);
const mockedFindMany = vi.mocked(prisma.sshKey.findMany);
const mockedDeleteMany = vi.mocked(prisma.sshKey.deleteMany);

const createEd25519PublicKey = (comment = 'test@gitzone'): string => {
  const { publicKey } = generateKeyPairSync('ed25519');

  const der = publicKey.export({
    format: 'der',
    type: 'spki',
  });

  const rawPublicKey = der.subarray(-32);

  const encodeSshString = (value: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(value.length);

    return Buffer.concat([length, value]);
  };

  const blob = Buffer.concat([
    encodeSshString(Buffer.from('ssh-ed25519')),
    encodeSshString(rawPublicKey),
  ]);

  return `ssh-ed25519 ${blob.toString('base64')} ${comment}`;
};

const createStoredSshKey = () => ({
  id: 'ssh-key-1',
  name: 'My Laptop',
  fingerprint: 'SHA256:test-fingerprint',
  keyType: 'ssh-ed25519',
  lastUsedAt: null,
  createdAt: new Date('2026-11-13T10:00:00.000Z'),
});

describe('SSH key service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSshKey', () => {
    it('creates a valid Ed25519 SSH key', async () => {
      const publicKey = createEd25519PublicKey();

      const storedKey = createStoredSshKey();

      mockedCreate.mockResolvedValue(storedKey as never);

      const result = await createSshKey('user-1', 'My Laptop', publicKey);

      expect(result).toEqual(storedKey);

      expect(mockedCreate).toHaveBeenCalledOnce();

      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            name: 'My Laptop',
            publicKey,
            keyType: 'ssh-ed25519',
            fingerprint: expect.stringMatching(/^SHA256:/),
          }),
        }),
      );
    });

    it('generates the same fingerprint for the same key with different comments', async () => {
      const publicKey = createEd25519PublicKey();

      const [keyData] = publicKey.split(' ');

      const encodedKey = publicKey.split(' ')[1];

      const firstKey = `${keyData} ${encodedKey} first-comment`;
      const secondKey = `${keyData} ${encodedKey} second-comment`;

      mockedCreate.mockResolvedValue(createStoredSshKey() as never);

      await createSshKey('user-1', 'First name', firstKey);

      await createSshKey('user-2', 'Second name', secondKey);

      const firstFingerprint = mockedCreate.mock.calls[0]?.[0].data.fingerprint;
      const secondFingerprint = mockedCreate.mock.calls[1]?.[0].data.fingerprint;

      expect(firstFingerprint).toBe(secondFingerprint);
    });

    it('rejects an invalid public key', async () => {
      await expect(
        createSshKey('user-1', 'Invalid key', 'ssh-ed25519 invalid-key'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_SSH_PUBLIC_KEY',
      });

      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('rejects unsupported SSH algorithms', async () => {
      const invalidKey = `ssh-dss ${Buffer.from('unsupported').toString('base64')}`;

      await expect(createSshKey('user-1', 'Unsupported key', invalidKey)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_SSH_PUBLIC_KEY',
      });

      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('rejects a duplicate SSH fingerprint', async () => {
      mockedCreate.mockRejectedValue({
        code: 'P2002',
      } as never);

      await expect(
        createSshKey('user-1', 'Duplicate key', createEd25519PublicKey()),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SSH_KEY_ALREADY_EXISTS',
      });
    });

    it('does not expose private key data in the database payload', async () => {
      const publicKey = createEd25519PublicKey();

      mockedCreate.mockResolvedValue(createStoredSshKey() as never);

      await createSshKey('user-1', 'Public key only', publicKey);

      const createArguments = mockedCreate.mock.calls[0]?.[0];

      expect(createArguments?.data).not.toHaveProperty('privateKey');
      expect(createArguments?.data.publicKey).toBe(publicKey);
    });
  });

  describe('getSshKeys', () => {
    it('returns only the authenticated user SSH keys', async () => {
      const keys = [createStoredSshKey()];

      mockedFindMany.mockResolvedValue(keys as never);

      const result = await getSshKeys('user-1');

      expect(result).toEqual(keys);

      expect(mockedFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      );
    });

    it('returns an empty array when the user has no keys', async () => {
      mockedFindMany.mockResolvedValue([] as never);

      const result = await getSshKeys('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('revokeSshKey', () => {
    it('revokes an SSH key owned by the user', async () => {
      mockedDeleteMany.mockResolvedValue({
        count: 1,
      } as never);

      await expect(revokeSshKey('user-1', 'ssh-key-1')).resolves.toBeUndefined();

      expect(mockedDeleteMany).toHaveBeenCalledWith({
        where: {
          id: 'ssh-key-1',
          userId: 'user-1',
        },
      });
    });

    it('does not allow a user to revoke another users key', async () => {
      mockedDeleteMany.mockResolvedValue({
        count: 0,
      } as never);

      await expect(revokeSshKey('user-2', 'ssh-key-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'SSH_KEY_NOT_FOUND',
      });

      expect(mockedDeleteMany).toHaveBeenCalledWith({
        where: {
          id: 'ssh-key-1',
          userId: 'user-2',
        },
      });
    });

    it('returns 404 when the SSH key does not exist', async () => {
      mockedDeleteMany.mockResolvedValue({
        count: 0,
      } as never);

      await expect(revokeSshKey('user-1', 'missing-key')).rejects.toMatchObject({
        statusCode: 404,
        code: 'SSH_KEY_NOT_FOUND',
      });
    });
  });
});
