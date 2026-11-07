import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import { repositoryErrorSchema } from './repository.schemas.js';

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

const starActionResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositoryId: z.string(),
      starred: z.boolean(),
    }),
  })
  .openapi('RepositoryStarActionResponse');

const starCountResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositoryId: z.string(),
      starCount: z.number().int().nonnegative(),
    }),
  })
  .openapi('RepositoryStarCountResponse');

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const bearerSecurity = [{ BearerAuth: [] }];

const commonErrors = {
  400: jsonResponse('Invalid repository parameters.', repositoryErrorSchema),
  401: jsonResponse('Authentication is required or invalid.', repositoryErrorSchema),
  403: jsonResponse('You do not have permission to access this repository.', repositoryErrorSchema),
  404: jsonResponse('Repository was not found.', repositoryErrorSchema),
  500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
};

// Star repository
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/star',
  tags: ['Repositories'],
  operationId: 'starRepository',
  summary: 'Star a repository',
  description:
    'Stars a repository for the authenticated user. Repeated requests do not create duplicate stars.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository starred successfully.', starActionResponseSchema),
    ...commonErrors,
  },
});

// Unstar repository
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/star',
  tags: ['Repositories'],
  operationId: 'unstarRepository',
  summary: 'Unstar a repository',
  description:
    'Removes the authenticated user star from a repository. The operation succeeds even if the user has not previously starred it.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository unstarred successfully.', starActionResponseSchema),
    ...commonErrors,
  },
});

// Get repository star count
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/stars/count',
  tags: ['Repositories'],
  operationId: 'getRepositoryStarCount',
  summary: 'Get repository star count',
  description:
    'Returns the total number of stars for a repository. Authentication is optional; authenticated users may access repositories they are authorized to read.',
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository star count retrieved successfully.', starCountResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
