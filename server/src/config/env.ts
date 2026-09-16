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

  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1, 'JWT_ACCESS_EXPIRES_IN is required'),

  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),

  GIT_STORAGE_PATH: z.string().trim().min(1, 'GIT_STORAGE_PATH is required'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const env = result.data;
