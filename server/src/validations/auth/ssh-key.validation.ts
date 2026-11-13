import { z } from 'zod';

const SSH_PUBLIC_KEY_PATTERN =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+={0,2}(?:\s+[\x20-\x7E]{1,200})?$/;

export const createSshKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'SSH key name is required')
    .max(100, 'SSH key name must be at most 100 characters'),

  publicKey: z
    .string()
    .trim()
    .min(1, 'SSH public key is required')
    .max(16384, 'SSH public key is too large')
    .regex(SSH_PUBLIC_KEY_PATTERN, 'Invalid or unsupported SSH public key format'),
});

export type CreateSshKeyInput = z.infer<typeof createSshKeySchema>;
