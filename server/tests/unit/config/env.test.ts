import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const setValidEnv = (): void => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5000';
  process.env.BODY_LIMIT = '1mb';
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/gitzone';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
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
      BODY_LIMIT: '1mb',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/gitzone',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      GIT_STORAGE_PATH: './storage/test-repositories',
    });
  });

  it('uses default NODE_ENV, PORT, and BODY_LIMIT values', async () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.BODY_LIMIT;

    const { env } = await loadEnv();

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(5000);
    expect(env.BODY_LIMIT).toBe('1mb');
  });

  it('converts PORT to a number', async () => {
    process.env.PORT = '8080';

    const { env } = await loadEnv();

    expect(env.PORT).toBe(8080);
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

  it('rejects an invalid BODY_LIMIT', async () => {
    process.env.BODY_LIMIT = 'invalid';

    await expect(loadEnv()).rejects.toThrow('Invalid environment configuration');
  });

  it.each([
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
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
});
