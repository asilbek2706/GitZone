import { describe, expect, it } from 'vitest';

import {
  generateTwoFactorChallengeToken,
  hashTwoFactorChallengeToken,
} from '../../../../src/utils/auth/two-factor/challenge.js';

describe('two-factor challenge token utilities', () => {
  it('generates a cryptographically strong opaque challenge token', () => {
    const challenge = generateTwoFactorChallengeToken();

    expect(challenge.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(challenge.tokenHash).not.toBe(challenge.token);
  });

  it('stores the SHA-256 representation of the generated token', () => {
    const challenge = generateTwoFactorChallengeToken();

    expect(challenge.tokenHash).toBe(hashTwoFactorChallengeToken(challenge.token));
  });

  it('generates different tokens on separate calls', () => {
    const first = generateTwoFactorChallengeToken();
    const second = generateTwoFactorChallengeToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('creates a challenge that expires approximately five minutes later', () => {
    const before = Date.now();

    const challenge = generateTwoFactorChallengeToken();

    const after = Date.now();

    expect(challenge.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);

    expect(challenge.expiresAt.getTime()).toBeLessThanOrEqual(after + 5 * 60 * 1000);
  });

  it('hashes the same challenge token deterministically', () => {
    const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

    expect(hashTwoFactorChallengeToken(token)).toBe(hashTwoFactorChallengeToken(token));
  });

  it('produces different hashes for different challenge tokens', () => {
    expect(hashTwoFactorChallengeToken('challenge-one')).not.toBe(
      hashTwoFactorChallengeToken('challenge-two'),
    );
  });
});
