import { describe, expect, it } from 'vitest';

import { createSshKeySchema } from '../../../src/validations/auth/ssh-key.validation.js';

describe('SSH key validation', () => {
  const validPayload = {
    name: 'My Windows Laptop',
    publicKey: `ssh-ed25519 ${Buffer.from('test-public-key').toString('base64')} asilbek@gitzone`,
  };

  it('accepts a valid SSH key payload', () => {
    const result = createSshKeySchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it('trims the SSH key name', () => {
    const result = createSshKeySchema.safeParse({
      ...validPayload,
      name: '  My Laptop  ',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('My Laptop');
    }
  });

  it('rejects an empty key name', () => {
    expect(
      createSshKeySchema.safeParse({
        ...validPayload,
        name: '   ',
      }).success,
    ).toBe(false);
  });

  it('rejects a key name longer than 100 characters', () => {
    expect(
      createSshKeySchema.safeParse({
        ...validPayload,
        name: 'A'.repeat(101),
      }).success,
    ).toBe(false);
  });

  it('rejects an empty public key', () => {
    expect(
      createSshKeySchema.safeParse({
        ...validPayload,
        publicKey: '',
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported SSH algorithms', () => {
    for (const algorithm of ['ssh-dss', 'unknown-key']) {
      const result = createSshKeySchema.safeParse({
        ...validPayload,
        publicKey: `${algorithm} ${Buffer.from('test').toString('base64')}`,
      });

      expect(result.success).toBe(false);
    }
  });

  it('rejects malformed public key data', () => {
    for (const publicKey of [
      'invalid-public-key',
      'ssh-ed25519',
      'ssh-ed25519 invalid!',
      'ssh-ed25519 abc\nssh-rsa def',
    ]) {
      expect(
        createSshKeySchema.safeParse({
          ...validPayload,
          publicKey,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects public keys larger than the configured limit', () => {
    expect(
      createSshKeySchema.safeParse({
        ...validPayload,
        publicKey: `ssh-ed25519 ${'A'.repeat(16385)}`,
      }).success,
    ).toBe(false);
  });

  it('rejects unauthorized fields', () => {
    expect(
      createSshKeySchema.safeParse({
        ...validPayload,
        userId: 'another-user',
        fingerprint: 'SHA256:fake',
      }).success,
    ).toBe(false);
  });
});
