import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  CORS_ORIGIN: z.url('CORS_ORIGIN must be a valid URL').default('http://localhost:5173'),

  TRUST_PROXY: z
    .enum(['true', 'false'], {
      error: 'TRUST_PROXY must be either true or false',
    })
    .default('false')
    .transform((value) => value === 'true'),

  BODY_LIMIT: z
    .string()
    .trim()
    .regex(/^[1-9]\d*(b|kb|mb|gb)$/i, 'BODY_LIMIT must be a valid size such as 100kb or 1mb')
    .default('1mb'),

  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .trim()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),

  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),

  TWO_FACTOR_ENCRYPTION_KEY: z
    .string()
    .trim()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'TWO_FACTOR_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64 hexadecimal characters',
    ),

  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1, 'JWT_ACCESS_EXPIRES_IN is required'),

  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),

  GIT_STORAGE_PATH: z.string().trim().min(1, 'GIT_STORAGE_PATH is required'),

  GIT_EXECUTABLE_PATH: z
    .string()
    .trim()
    .min(
      1,
      'GIT_EXECUTABLE_PATH must not be empty',
    )
    .default('git'),

  GIT_CHILD_PATH: z
    .string()
    .trim()
    .min(
      1,
      'GIT_CHILD_PATH must not be empty',
    )
    .default('/usr/bin:/bin'),

  GIT_HTTP_BACKEND_PATH: z
    .string()
    .trim()
    .min(1, 'GIT_HTTP_BACKEND_PATH must not be empty')
    .default('/usr/lib/git-core/git-http-backend'),

  GIT_HTTP_MAX_HEADER_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(65536)
    .default(16384),

  GIT_READ_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60000)
    .default(5000),

  GIT_READ_MAX_BUFFER_BYTES: z.coerce
    .number()
    .int()
    .min(65536)
    .max(52428800)
    .default(5242880),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const env = result.data;
