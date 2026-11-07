import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import { repositoryErrorSchema, repositorySchema } from './repository.schemas.js';
import { forkRepositorySchema } from '../../validations/repositories/repository-fork.validation.js';

const repositoryParamsSchema = z.object({
  username: z.string().min(1).openapi({
    description: 'Repository owner username.',
    example: 'asilbek',
  }),
  name: z.string().min(1).openapi({
    description: 'Repository name.',
    example: 'gitzone',
  }),
});

const forkRepositoryResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repository: repositorySchema
        .extend({
          forkedFromId: z.string().nullable(),
        })
        .openapi('ForkedRepository'),
    }),
  })
  .openapi('ForkRepositoryResponse');

const forkNetworkParentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    owner: z.string(),
  })
  .openapi('ForkNetworkParent');

const forkNetworkItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    owner: z.string(),
  })
  .openapi('ForkNetworkItem');

const forkNetworkSchema = z
  .object({
    repositoryId: z.string(),
    isFork: z.boolean(),
    parent: forkNetworkParentSchema.nullable(),
    parentAccessible: z.boolean().nullable(),
    forkCount: z.number().int().nonnegative(),
    totalForkCount: z.number().int().nonnegative(),
    forks: z.array(forkNetworkItemSchema),
    hasMore: z.boolean(),
  })
  .openapi('RepositoryForkNetwork');

const forkNetworkResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      network: forkNetworkSchema,
    }),
  })
  .openapi('RepositoryForkNetworkResponse');

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const bearerSecurity = [{ BearerAuth: [] }];

// Create repository fork
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/fork',
  tags: ['Repositories'],
  operationId: 'forkRepository',
  summary: 'Fork a repository',
  description:
    'Creates a fork of an existing repository under the authenticated user account. The name, description, and isPrivate fields are optional. If omitted, the source repository values are used. Private repositories cannot be forked as public repositories.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: forkRepositorySchema.openapi('ForkRepositoryRequest'),
        },
      },
    },
  },
  responses: {
    201: jsonResponse(
      'Repository fork created successfully.',
      forkRepositoryResponseSchema,
    ),
    400: jsonResponse('Invalid repository parameters or fork data.', repositoryErrorSchema),
    401: jsonResponse('Authentication is required or invalid.', repositoryErrorSchema),
    403: jsonResponse('You do not have permission to fork this repository or its visibility.', repositoryErrorSchema),
    404: jsonResponse('Source repository or fork owner was not found.', repositoryErrorSchema),
    409: jsonResponse('A repository with this name already exists or the fork would conflict with its source.', repositoryErrorSchema),
    500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
  },
});

// Get repository fork network
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/forks/network',
  tags: ['Repositories'],
  operationId: 'getRepositoryForkNetwork',
  summary: 'Get repository fork network',
  description:
    'Returns the repository fork network, including its parent repository when accessible, visibility information, visible fork counts, and visible child forks. The forks list is limited to 100 entries. Authentication is optional and may provide access to additional private forks.',
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse(
      'Repository fork network retrieved successfully.',
      forkNetworkResponseSchema,
    ),
    400: jsonResponse('Invalid repository parameters.', repositoryErrorSchema),
    403: jsonResponse('You do not have permission to access this repository.', repositoryErrorSchema),
    404: jsonResponse('Repository was not found.', repositoryErrorSchema),
    500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
  },
});
