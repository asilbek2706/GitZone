import { z } from 'zod';

export const verifyTwoFactorSetupSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Two-factor authentication code must be exactly 6 digits'),
});

export type VerifyTwoFactorSetupSchemaInput = z.infer<typeof verifyTwoFactorSetupSchema>;
