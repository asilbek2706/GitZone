import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';

const gitRepositoryParamsSchema = z.object({
  username: z.string().min(1).openapi({
    example: 'asilbek',
    description: 'Repository owner username or organization slug.',
  }),
  repository: z.string().min(1).openapi({
    example: 'gitzone',
    description: 'Repository name without the .git suffix.',
  }),
});

const gitServiceSchema = z.enum([
  'git-upload-pack',
  'git-receive-pack',
]);

const gitControllerErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
});

const gitBackendErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const gitHttpErrorSchema = z.union([
  gitControllerErrorSchema,
  gitBackendErrorSchema,
]);

const binarySchema = z.string().openapi({
  format: 'binary',
});

const basicAuthSecurity = [{ GitBasicAuth: [] }];

const optionalBasicAuthSecurity = [
  {},
  { GitBasicAuth: [] },
];

const gitErrorResponse = (
  description: string,
  includeAuthHeader = false,
) => ({
  description,
  ...(includeAuthHeader
    ? {
        headers: {
          'WWW-Authenticate': {
            description: 'HTTP Basic authentication challenge.',
            schema: {
              type: 'string' as const,
              example: 'Basic realm="GitZone"',
            },
          },
        },
      }
    : {}),
  content: {
    'application/json': {
      schema: gitHttpErrorSchema,
    },
  },
});

const commonGitErrors = {
  400: gitErrorResponse('Invalid Git HTTP path or service.'),
  401: gitErrorResponse(
    'Git authentication is required or invalid.',
    true,
  ),
  403: gitErrorResponse('Repository access is forbidden.'),
  404: gitErrorResponse('Repository was not found.'),
  405: gitErrorResponse('HTTP method is not supported for this endpoint.'),
  500: gitErrorResponse('Git HTTP backend failed.'),
  502: gitErrorResponse('Git HTTP backend returned an invalid response.'),
  503: gitErrorResponse('Git distributed lock was lost.'),
};

// ==========================================
// GET /info/refs
// ==========================================

const gitRefsQuerySchema = z.object({
  service: gitServiceSchema.openapi({
    description: 'Git Smart HTTP service to advertise.',
    example: 'git-upload-pack',
  }),
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/{username}/{repository}.git/info/refs',
  tags: ['Git'],
  operationId: 'getGitHttpInfoRefs',
  summary: 'Git HTTP service discovery',
  description: `
Advertises the available Git references through Git Smart HTTP.

Supported services:
- git-upload-pack: clone and fetch.
- git-receive-pack: push.

Public repositories may allow unauthenticated read access.
Private repositories require Git Basic Auth.
The git-receive-pack service always requires authentication and write permission.

Authentication uses the GitZone username and a Personal Access Token as the Basic Auth password.

Organization repositories are supported.
`,
  security: optionalBasicAuthSecurity,
  request: {
    params: gitRepositoryParamsSchema,
    query: gitRefsQuerySchema,
  },
  responses: {
    200: {
      description: 'Git service advertisement.',
      content: {
        'application/x-git-upload-pack-advertisement': {
          schema: binarySchema,
        },
        'application/x-git-receive-pack-advertisement': {
          schema: binarySchema,
        },
      },
    },
    ...commonGitErrors,
  },
});

// ==========================================
// POST /git-upload-pack
// ==========================================

openApiRegistry.registerPath({
  method: 'post',
  path: '/{username}/{repository}.git/git-upload-pack',
  tags: ['Git'],
  operationId: 'gitHttpUploadPack',
  summary: 'Git upload-pack',
  description: `
Handles Git fetch and clone operations through Git Smart HTTP.

The request contains Git upload-pack protocol data.
The response contains Git upload-pack protocol results.

Public repositories may allow unauthenticated access.
Private repositories require Git Basic Auth.

Authentication uses the GitZone username and Personal Access Token.
`,
  security: optionalBasicAuthSecurity,
  request: {
    params: gitRepositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/x-git-upload-pack-request': {
          schema: binarySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Git upload-pack protocol response.',
      content: {
        'application/x-git-upload-pack-result': {
          schema: binarySchema,
        },
      },
    },
    ...commonGitErrors,
  },
});

// ==========================================
// POST /git-receive-pack
// ==========================================

openApiRegistry.registerPath({
  method: 'post',
  path: '/{username}/{repository}.git/git-receive-pack',
  tags: ['Git'],
  operationId: 'gitHttpReceivePack',
  summary: 'Git receive-pack',
  description: `
Handles Git push operations through Git Smart HTTP.

The request contains Git receive-pack protocol data.
The response contains Git receive-pack protocol results.

Authentication is always required.

The authenticated user must have permission to modify the repository.
Repository transfer restrictions and protected write rules are enforced by the backend.

Authentication uses the GitZone username and Personal Access Token.
`,
  security: basicAuthSecurity,
  request: {
    params: gitRepositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/x-git-receive-pack-request': {
          schema: binarySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Git receive-pack protocol response.',
      content: {
        'application/x-git-receive-pack-result': {
          schema: binarySchema,
        },
      },
    },
    ...commonGitErrors,
  },
});

