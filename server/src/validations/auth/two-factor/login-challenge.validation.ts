import { z } from 'zod';

export const verifyTwoFactorLoginChallengeSchema = z.object({
  challengeToken: z.string().trim().min(1, 'Two-factor challenge token is required'),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Two-factor authentication code must be exactly 6 digits'),
});

export type VerifyTwoFactorLoginChallengeSchemaInput = z.infer<
  typeof verifyTwoFactorLoginChallengeSchema
>;
