import { z } from 'zod';

export const verifyTwoFactorRecoveryLoginSchema = z.object({
  challengeToken: z.string().trim().min(1, 'Two-factor challenge token is required'),

  recoveryCode: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{32}$/, 'Recovery code must be a valid 32-character hexadecimal code'),
});

export type VerifyTwoFactorRecoveryLoginSchemaInput = z.infer<
  typeof verifyTwoFactorRecoveryLoginSchema
>;
