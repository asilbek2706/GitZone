import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required')
    .max(72, 'Password must be at most 72 characters'),
});

export type LoginSchemaInput = z.infer<typeof loginSchema>;
