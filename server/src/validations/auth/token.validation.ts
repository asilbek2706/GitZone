import { z } from 'zod';

export const createPersonalAccessTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Token name is required')
    .max(100, 'Token name must be at most 100 characters'),

  expiresAt: z.string().datetime().optional(),
});

export type CreatePersonalAccessTokenSchemaInput = z.infer<typeof createPersonalAccessTokenSchema>;
