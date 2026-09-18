import { describe, expect, it } from 'vitest';

import {
  generateRecoveryCodes,
  hashRecoveryCode,
} from '../../../../src/utils/auth/two-factor/recovery-code.js';

describe('recovery code utilities', () => {
  it('generates ten unique recovery codes', () => {
    const recoveryCodes = generateRecoveryCodes();

    expect(recoveryCodes).toHaveLength(10);

    const plaintextCodes = recoveryCodes.map(({ code }) => code);

    expect(new Set(plaintextCodes).size).toBe(10);
  });

  it('generates recovery codes with 128 bits of random data', () => {
    const recoveryCodes = generateRecoveryCodes();

    for (const { code } of recoveryCodes) {
      expect(code).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('stores a SHA-256 hash representation for every recovery code', () => {
    const recoveryCodes = generateRecoveryCodes();

    for (const { code, codeHash } of recoveryCodes) {
      expect(codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(codeHash).toBe(hashRecoveryCode(code));
      expect(codeHash).not.toBe(code);
    }
  });

  it('produces deterministic hashes for the same recovery code', () => {
    const code = '0123456789abcdef0123456789abcdef';

    expect(hashRecoveryCode(code)).toBe(hashRecoveryCode(code));
  });

  it('produces different hashes for different recovery codes', () => {
    const firstCode = '0123456789abcdef0123456789abcdef';
    const secondCode = 'fedcba9876543210fedcba9876543210';

    expect(hashRecoveryCode(firstCode)).not.toBe(hashRecoveryCode(secondCode));
  });
});
