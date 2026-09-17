import { describe, expect, it } from 'vitest';

import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from '../../../../src/modules/auth/two-factor/two-factor.crypto.js';

describe('two-factor crypto', () => {
  it('encrypts and decrypts a two-factor secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    const encrypted = encryptTwoFactorSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(decryptTwoFactorSecret(encrypted)).toBe(secret);
  });

  it('uses a unique IV for every encryption', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    const first = encryptTwoFactorSecret(secret);
    const second = encryptTwoFactorSecret(secret);

    expect(first).not.toBe(second);
    expect(decryptTwoFactorSecret(first)).toBe(secret);
    expect(decryptTwoFactorSecret(second)).toBe(secret);
  });

  it('rejects an empty secret', () => {
    expect(() => encryptTwoFactorSecret('')).toThrow('Two-factor secret cannot be empty');
  });

  it('rejects a malformed encrypted value', () => {
    expect(() => decryptTwoFactorSecret('invalid')).toThrow('Invalid encrypted two-factor secret');
  });

  it('rejects an unsupported encrypted value version', () => {
    const encrypted = encryptTwoFactorSecret('JBSWY3DPEHPK3PXP');
    const [, iv, authTag, ciphertext] = encrypted.split('.');

    const unsupported = ['v999', iv, authTag, ciphertext].join('.');

    expect(() => decryptTwoFactorSecret(unsupported)).toThrow(
      'Invalid encrypted two-factor secret',
    );
  });

  it('detects ciphertext tampering', () => {
    const encrypted = encryptTwoFactorSecret('JBSWY3DPEHPK3PXP');
    const [version, iv, authTag, ciphertext] = encrypted.split('.');

    if (!version || !iv || !authTag || !ciphertext) {
      throw new Error('Expected a valid encrypted test value');
    }

    const ciphertextBuffer = Buffer.from(ciphertext, 'base64url');

    if (ciphertextBuffer.length === 0) {
      throw new Error('Expected non-empty ciphertext');
    }

    ciphertextBuffer[0] = ciphertextBuffer[0]! ^ 1;

    const tampered = [version, iv, authTag, ciphertextBuffer.toString('base64url')].join('.');

    expect(() => decryptTwoFactorSecret(tampered)).toThrow('Unable to decrypt two-factor secret');
  });

  it('detects authentication tag tampering', () => {
    const encrypted = encryptTwoFactorSecret('JBSWY3DPEHPK3PXP');
    const [version, iv, authTag, ciphertext] = encrypted.split('.');

    if (!version || !iv || !authTag || !ciphertext) {
      throw new Error('Expected a valid encrypted test value');
    }

    const authTagBuffer = Buffer.from(authTag, 'base64url');

    if (authTagBuffer.length === 0) {
      throw new Error('Expected non-empty authentication tag');
    }

    authTagBuffer[0] = authTagBuffer[0]! ^ 1;

    const tampered = [version, iv, authTagBuffer.toString('base64url'), ciphertext].join('.');

    expect(() => decryptTwoFactorSecret(tampered)).toThrow('Unable to decrypt two-factor secret');
  });
});
