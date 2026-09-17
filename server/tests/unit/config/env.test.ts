import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const TEST_ACCESS_SECRET = 'test-access-secret-at-least-32-characters';
const TEST_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters';
const TEST_TWO_FACTOR_ENCRYPTION_KEY = 'a'.repeat(64);

const setValidEnv = (): void => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5000';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.TRUST_PROXY = 'false';
  process.env.BODY_LIMIT = '1mb';
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/gitzone';
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
  process.env.TWO_FACTOR_ENCRYPTION_KEY = TEST_TWO_FACTOR_ENCRYPTION_KEY;
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.GIT_STORAGE_PATH = './storage/test-repositories';
};

const loadEnv = async () => {
  vi.resetModules();

  return import('../../../src/config/env.js');
};

describe('environment configuration', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    setValidEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('loads valid environment configuration', async () => {
    const { env } = await loadEnv();

    expect(env).toMatchObject({
      NODE_ENV: 'test',
      PORT: 5000,
      CORS_ORIGIN: 'http://localhost:5173',
      TRUST_PROXY: false,
      BODY_LIMIT: '1mb',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/gitzone',
      JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
      JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
      TWO_FACTOR_ENCRYPTION_KEY: TEST_TWO_FACTOR_ENCRYPTION_KEY,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      GIT_STORAGE_PATH: './storage/test-repositories',
    });
  });

  it('uses default NODE_ENV, PORT, CORS_ORIGIN, TRUST_PROXY, and BODY_LIMIT values', async () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    delete process.env.TRUST_PROXY;
    delete process.env.BODY_LIMIT;

    const { env } = await loadEnv();

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(5000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.BODY_LIMIT).toBe('1mb');
  });

  it('converts PORT to a number', async () => {
    process.env.PORT = '8080';

    const { env } = await loadEnv();

    expect(env.PORT).toBe(8080);
  });

  it('converts TRUST_PROXY true to boolean true', async () => {
    process.env.TRUST_PROXY = 'true';

    const { env } = await loadEnv();

    expect(env.TRUST_PROXY).toBe(true);
  });

  it('converts non-true TRUST_PROXY values to false', async () => {
    process.env.TRUST_PROXY = 'false';

    const { env } = await loadEnv();

    expect(env.TRUST_PROXY).toBe(false);
  });

  it('rejects an invalid TRUST_PROXY value', async () => {
    process.env.TRUST_PROXY = 'invalid';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects an invalid NODE_ENV', async () => {
    process.env.NODE_ENV = 'invalid';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects a non-numeric PORT', async () => {
    process.env.PORT = 'abc';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects a PORT below the valid range', async () => {
    process.env.PORT = '0';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects a PORT above the valid range', async () => {
    process.env.PORT = '65536';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects an invalid CORS_ORIGIN', async () => {
    process.env.CORS_ORIGIN = 'invalid-url';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects an invalid BODY_LIMIT', async () => {
    process.env.BODY_LIMIT = 'invalid';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it.each([
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'TWO_FACTOR_ENCRYPTION_KEY',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'GIT_STORAGE_PATH',
  ])('rejects missing required environment variable %s', async (key) => {
    delete process.env[key];

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it('reports the invalid environment variable name', async () => {
    delete process.env.DATABASE_URL;

    await expect(loadEnv()).rejects.toThrow('DATABASE_URL');
  });

  it('rejects a weak JWT access secret', async () => {
    process.env.JWT_ACCESS_SECRET = 'too-short';

    await expect(loadEnv()).rejects.toThrow(
      'JWT_ACCESS_SECRET must be at least 32 characters long',
    );
  });

  it('rejects a weak JWT refresh secret', async () => {
    process.env.JWT_REFRESH_SECRET = 'too-short';

    await expect(loadEnv()).rejects.toThrow(
      'JWT_REFRESH_SECRET must be at least 32 characters long',
    );
  });

  it('rejects a two-factor encryption key with the wrong length', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'a'.repeat(63);

    await expect(loadEnv()).rejects.toThrow(
      'TWO_FACTOR_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64 hexadecimal characters',
    );
  });

  it('rejects a non-hexadecimal two-factor encryption key', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'z'.repeat(64);

    await expect(loadEnv()).rejects.toThrow(
      'TWO_FACTOR_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64 hexadecimal characters',
    );
  });
});
