import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import { createSshKeySchema } from '../../validations/auth/ssh-key.validation.js';

const sshKeySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    fingerprint: z.string(),
    keyType: z.string(),
    lastUsedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('SshKey');

const createSshKeyResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      sshKey: sshKeySchema,
    }),
  })
  .openapi('CreateSshKeyResponse');

const listSshKeysResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      sshKeys: z.array(sshKeySchema),
    }),
  })
  .openapi('ListSshKeysResponse');

const revokeSshKeyResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('RevokeSshKeyResponse');

const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('SshKeyErrorResponse');

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const bearerSecurity = [{ BearerAuth: [] }];

// GET /api/auth/ssh-keys
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/auth/ssh-keys',
  tags: ['SSH Keys'],
  operationId: 'listSshKeys',
  summary: 'List SSH public keys',
  description: `
Returns the authenticated user's registered SSH public keys.

Private keys are never stored or returned.
The response includes the key fingerprint, type, creation date,
and last-used date.
`,
  security: bearerSecurity,
  responses: {
    200: jsonResponse('SSH public keys retrieved successfully.', listSshKeysResponseSchema),
    401: jsonResponse(
      'Authentication is required or the access token is invalid.',
      errorResponseSchema,
    ),
    500: jsonResponse('Unexpected server error.', errorResponseSchema),
  },
});

// POST /api/auth/ssh-keys
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/ssh-keys',
  tags: ['SSH Keys'],
  operationId: 'createSshKey',
  summary: 'Add an SSH public key',
  description: `
Registers an SSH public key for the authenticated user.

Supported key types:
- ssh-ed25519
- ssh-rsa
- ecdsa-sha2-nistp256
- ecdsa-sha2-nistp384
- ecdsa-sha2-nistp521

Only public keys are accepted. Never submit a private key.
The same public key cannot be registered more than once.
`,
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createSshKeySchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('SSH public key registered successfully.', createSshKeyResponseSchema),
    400: jsonResponse(
      'Invalid SSH key data or unsupported public key format.',
      errorResponseSchema,
    ),
    401: jsonResponse(
      'Authentication is required or the access token is invalid.',
      errorResponseSchema,
    ),
    409: jsonResponse('This SSH public key has already been registered.', errorResponseSchema),
    500: jsonResponse('Unexpected server error.', errorResponseSchema),
  },
});

// DELETE /api/auth/ssh-keys/{keyId}
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/auth/ssh-keys/{keyId}',
  tags: ['SSH Keys'],
  operationId: 'revokeSshKey',
  summary: 'Remove an SSH public key',
  description: `
Revokes an SSH public key belonging to the authenticated user.

After revocation, the key must no longer authenticate new Git SSH connections.
`,
  security: bearerSecurity,
  request: {
    params: z.object({
      keyId: z.string().min(1).openapi({
        description: 'ID of the SSH key to revoke.',
      }),
    }),
  },
  responses: {
    200: jsonResponse('SSH public key revoked successfully.', revokeSshKeyResponseSchema),
    400: jsonResponse('SSH key ID is missing or invalid.', errorResponseSchema),
    401: jsonResponse(
      'Authentication is required or the access token is invalid.',
      errorResponseSchema,
    ),
    404: jsonResponse(
      'SSH key was not found or does not belong to the authenticated user.',
      errorResponseSchema,
    ),
    500: jsonResponse('Unexpected server error.', errorResponseSchema),
  },
});

