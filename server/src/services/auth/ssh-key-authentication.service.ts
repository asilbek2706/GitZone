import { createHash, timingSafeEqual } from 'node:crypto';
import prisma from '../../config/prisma.js';
import ssh2 from 'ssh2';

const { utils } = ssh2;

const MAX_SSH_KEY_BLOB_BYTES = 16_384;

export type SshPublicKeyAuthenticationInput = {
  keyAlgorithm: string;
  keyData: Buffer;
  signedData?: Buffer;
  signature?: Buffer;
  hashAlgorithm?: string;
};

export type SshPublicKeyAuthenticationResult =
  | {
      status: 'KEY_MATCHED';
    }
  | {
      status: 'AUTHENTICATED';
      keyId: string;
      userId: string;
      username: string;
    };

const calculateFingerprint = (keyData: Buffer): string =>
  `SHA256:${createHash('sha256').update(keyData).digest('base64').replace(/=+$/, '')}`;

const buffersMatch = (first: Buffer, second: Buffer): boolean => {
  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
};

export const authenticateSshPublicKey = async (
  input: SshPublicKeyAuthenticationInput,
): Promise<SshPublicKeyAuthenticationResult | null> => {
  if (
    !Buffer.isBuffer(input.keyData) ||
    input.keyData.length === 0 ||
    input.keyData.length > MAX_SSH_KEY_BLOB_BYTES
  ) {
    return null;
  }

  const fingerprint = calculateFingerprint(input.keyData);

  const storedKey = await prisma.sshKey.findUnique({
    where: {
      fingerprint,
    },
    select: {
      id: true,
      userId: true,
      keyType: true,
      publicKey: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!storedKey || storedKey.keyType !== input.keyAlgorithm) {
    return null;
  }
  let parsedKey: ReturnType<typeof utils.parseKey>;

  try {
    parsedKey = utils.parseKey(storedKey.publicKey);
  } catch {
    return null;
  }

  if (parsedKey instanceof Error || Array.isArray(parsedKey)) {
    return null;
  }

  const storedPublicKey = parsedKey.getPublicSSH();

  if (
    !storedPublicKey ||
    parsedKey.type !== storedKey.keyType ||
    !buffersMatch(Buffer.from(storedPublicKey), input.keyData)
  ) {
    return null;
  }

  /*
   * SSH public-key authentication may first contain an unsigned
   * request to check whether the server recognizes the public key.
   *
   * This only confirms that the key is registered. It must never
   * be treated as an authenticated user.
   */
  if (input.signature === undefined && input.signedData === undefined) {
    return {
      status: 'KEY_MATCHED',
    };
  }

  /*
   * A signed authentication request must contain both the
   * signature and the exact SSH authentication data.
   */
  if (
    !Buffer.isBuffer(input.signature) ||
    !Buffer.isBuffer(input.signedData) ||
    input.signature.length === 0 ||
    input.signedData.length === 0
  ) {
    return null;
  }

  try {
    if (parsedKey.verify(input.signedData, input.signature, input.hashAlgorithm) !== true) {
      return null;
    }
  } catch {
    return null;
  }

  /*
   * updateMany ensures a key revoked between lookup and
   * signature verification cannot authenticate the connection.
   */
  const usageUpdate = await prisma.sshKey.updateMany({
    where: {
      id: storedKey.id,
      userId: storedKey.userId,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  if (usageUpdate.count !== 1) {
    return null;
  }

  return {
    status: 'AUTHENTICATED',
    keyId: storedKey.id,
    userId: storedKey.userId,
    username: storedKey.user.username,
  };
};
