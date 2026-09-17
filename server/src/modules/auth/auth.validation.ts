import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores and hyphens',
    ),

  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),

  name: z.string().trim().max(100, 'Name must be at most 100 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required')
    .max(72, 'Password must be at most 72 characters'),
});

export const createPersonalAccessTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Token name is required')
    .max(100, 'Token name must be at most 100 characters'),

  expiresAt: z.string().datetime().optional(),
});

export const verifyTwoFactorSetupSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Two-factor authentication code must be exactly 6 digits'),
});

export type RegisterSchemaInput = z.infer<typeof registerSchema>;

export type LoginSchemaInput = z.infer<typeof loginSchema>;

export type CreatePersonalAccessTokenSchemaInput = z.infer<typeof createPersonalAccessTokenSchema>;

export type VerifyTwoFactorSetupSchemaInput = z.infer<typeof verifyTwoFactorSetupSchema>;
