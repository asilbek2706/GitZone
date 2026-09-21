import { z } from 'zod';

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Current password is required'),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Two-factor authentication code must be exactly 6 digits'),
});

export type DisableTwoFactorSchemaInput = z.infer<typeof disableTwoFactorSchema>;
