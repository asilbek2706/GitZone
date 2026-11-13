import { createHash } from 'node:crypto';

import { utils } from 'ssh2';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';

const SUPPORTED_KEY_TYPES = new Set([
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
]);

const sshKeySelect = {
  id: true,
  name: true,
  fingerprint: true,
  keyType: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

type ParsedSshPublicKey = {
  publicKey: string;
  keyType: string;
  fingerprint: string;
};

const invalidPublicKey = (): AppError =>
  new AppError('Invalid or unsupported SSH public key', 400, 'INVALID_SSH_PUBLIC_KEY');

const parseSshPublicKey = (input: string): ParsedSshPublicKey => {
  const normalizedInput = input.trim();

  if (
    normalizedInput.length === 0 ||
    normalizedInput.includes('\n') ||
    normalizedInput.includes('\r') ||
    normalizedInput.includes('\0')
  ) {
    throw invalidPublicKey();
  }

  const parts = normalizedInput.split(/\s+/);

  const algorithm = parts[0];

  if (!algorithm || !SUPPORTED_KEY_TYPES.has(algorithm) || !parts[1]) {
    throw invalidPublicKey();
  }

  let parsedKey: ReturnType<typeof utils.parseKey>;

  try {
    parsedKey = utils.parseKey(normalizedInput);
  } catch {
    throw invalidPublicKey();
  }

  if (parsedKey instanceof Error || Array.isArray(parsedKey) || parsedKey.type !== algorithm) {
    throw invalidPublicKey();
  }

  const publicKeyBlob = parsedKey.getPublicSSH();

  if (!publicKeyBlob || publicKeyBlob.length === 0) {
    throw invalidPublicKey();
  }

  const fingerprint = `SHA256:${createHash('sha256')
    .update(publicKeyBlob)
    .digest('base64')
    .replace(/=+$/, '')}`;

  return {
    publicKey: normalizedInput,
    keyType: parsedKey.type,
    fingerprint,
  };
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

export const createSshKey = async (userId: string, name: string, publicKey: string) => {
  const parsedKey = parseSshPublicKey(publicKey);

  try {
    return await prisma.sshKey.create({
      data: {
        userId,
        name,
        publicKey: parsedKey.publicKey,
        fingerprint: parsedKey.fingerprint,
        keyType: parsedKey.keyType,
      },
      select: sshKeySelect,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError('This SSH key has already been added', 409, 'SSH_KEY_ALREADY_EXISTS');
    }

    throw error;
  }
};

export const getSshKeys = async (userId: string) => {
  return prisma.sshKey.findMany({
    where: {
      userId,
    },
    select: sshKeySelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const revokeSshKey = async (userId: string, keyId: string): Promise<void> => {
  const result = await prisma.sshKey.deleteMany({
    where: {
      id: keyId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new AppError('SSH key not found', 404, 'SSH_KEY_NOT_FOUND');
  }
};
