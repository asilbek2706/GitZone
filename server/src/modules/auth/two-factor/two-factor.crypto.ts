import crypto from 'node:crypto';

import { env } from '../../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_VALUE_VERSION = 'v1';

const encryptionKey = Buffer.from(env.TWO_FACTOR_ENCRYPTION_KEY, 'hex');

if (encryptionKey.length !== 32) {
  throw new Error('TWO_FACTOR_ENCRYPTION_KEY must decode to exactly 32 bytes');
}

export const encryptTwoFactorSecret = (secret: string): string => {
  if (!secret) {
    throw new Error('Two-factor secret cannot be empty');
  }

  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_VALUE_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
};

export const decryptTwoFactorSecret = (encryptedValue: string): string => {
  const parts = encryptedValue.split('.');

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted two-factor secret');
  }

  const [version, ivEncoded, authTagEncoded, ciphertextEncoded] = parts;

  if (
    version !== ENCRYPTED_VALUE_VERSION ||
    !ivEncoded ||
    !authTagEncoded ||
    !ciphertextEncoded
  ) {
    throw new Error('Invalid encrypted two-factor secret');
  }

  const iv = Buffer.from(ivEncoded, 'base64url');
  const authTag = Buffer.from(authTagEncoded, 'base64url');
  const ciphertext = Buffer.from(ciphertextEncoded, 'base64url');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted two-factor secret');
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey,
      iv,
      {
        authTagLength: AUTH_TAG_LENGTH,
      },
    );

    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch {
    throw new Error('Unable to decrypt two-factor secret');
  }
};

