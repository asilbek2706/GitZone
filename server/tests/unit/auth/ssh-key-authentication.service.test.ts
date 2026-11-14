import { createHash, generateKeyPairSync, sign as cryptoSign } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';

import { authenticateSshPublicKey } from '../../../src/services/auth/ssh-key-authentication.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    sshKey: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

const mockedFindUnique = vi.mocked(prisma.sshKey.findUnique);
const mockedUpdateMany = vi.mocked(prisma.sshKey.updateMany);

const encodeSshString = (value: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(value.length);

  return Buffer.concat([length, value]);
};

const createTestKeyPair = () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const publicDer = publicKey.export({
    format: 'der',
    type: 'spki',
  });

  const rawPublicKey = publicDer.subarray(-32);

  const keyData = Buffer.concat([
    encodeSshString(Buffer.from('ssh-ed25519')),
    encodeSshString(rawPublicKey),
  ]);

  const signedData = Buffer.from('GitZone SSH authentication test');

  const rawSignature = cryptoSign(null, signedData, privateKey);

  const signature = Buffer.concat([
    encodeSshString(Buffer.from('ssh-ed25519')),
    encodeSshString(rawSignature),
  ]);

  const fingerprint = `SHA256:${createHash('sha256')
    .update(keyData)
    .digest('base64')
    .replace(/=+$/, '')}`;

  return {
    publicKey: `ssh-ed25519 ${keyData.toString('base64')} gitzone-test`,
    keyAlgorithm: 'ssh-ed25519',
    keyData,
    signedData,
    signature,
    fingerprint,
  };
};

const createStoredKey = (keyPair: ReturnType<typeof createTestKeyPair>) => ({
  id: 'ssh-key-1',
  userId: 'user-1',
  keyType: keyPair.keyAlgorithm,
  publicKey: keyPair.publicKey,
  user: {
    username: 'asilbek',
  },
});

describe('authenticateSshPublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes a registered key without authenticating an unsigned request', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
    });

    expect(result).toEqual({
      status: 'KEY_MATCHED',
    });

    expect(mockedFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fingerprint: keyPair.fingerprint,
        },
      }),
    );

    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('authenticates a registered key with a valid signature', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
      signedData: keyPair.signedData,
      signature: keyPair.signature,
    });

    expect(result).toEqual({
      status: 'AUTHENTICATED',
      keyId: 'ssh-key-1',
      userId: 'user-1',
      username: 'asilbek',
    });

    expect(mockedUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'ssh-key-1',
          userId: 'user-1',
        },
        data: {
          lastUsedAt: expect.any(Date),
        },
      }),
    );
  });

  it('rejects an unknown public key', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(null as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
      signedData: keyPair.signedData,
      signature: keyPair.signature,
    });

    expect(result).toBeNull();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a key with a mismatched algorithm', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: 'ssh-rsa',
      keyData: keyPair.keyData,
      signedData: keyPair.signedData,
      signature: keyPair.signature,
    });

    expect(result).toBeNull();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
      signedData: keyPair.signedData,
      signature: Buffer.from('invalid-signature'),
    });

    expect(result).toBeNull();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects when the SSH key was revoked during authentication', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
      signedData: keyPair.signedData,
      signature: keyPair.signature,
    });

    expect(result).toBeNull();
  });

  it('rejects incomplete signed authentication data', async () => {
    const keyPair = createTestKeyPair();

    mockedFindUnique.mockResolvedValue(createStoredKey(keyPair) as never);

    const result = await authenticateSshPublicKey({
      keyAlgorithm: keyPair.keyAlgorithm,
      keyData: keyPair.keyData,
      signature: keyPair.signature,
    });

    expect(result).toBeNull();
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects oversized public key blobs', async () => {
    const result = await authenticateSshPublicKey({
      keyAlgorithm: 'ssh-ed25519',
      keyData: Buffer.alloc(16_385),
    });

    expect(result).toBeNull();
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });
});
