import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import {
  repositoryErrorSchema,
  repositoryListResponseSchema,
  repositoryMessageResponseSchema,
  repositoryResponseSchema,
  repositoryWithOwnerResponseSchema,
} from './repository.schemas.js';

const repositoryNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9._-]+$/)
  .openapi({
    description: 'Repository name.',
    example: 'my-project',
  });

const usernameParamSchema = z.object({
  username: z.string().min(1).openapi({
    description: 'Repository owner username.',
    example: 'asilbek',
  }),
});

const repositoryParamsSchema = usernameParamSchema.extend({
  name: repositoryNameSchema,
});

const createRepositoryBodySchema = z
  .object({
    name: repositoryNameSchema,
    description: z.string().trim().max(500).optional().openapi({
      description: 'Optional repository description.',
      example: 'My personal project',
    }),
    isPrivate: z.boolean().optional().default(false).openapi({
      description: 'Whether the repository is private. Defaults to false.',
      example: false,
    }),
  })
  .openapi('CreateRepositoryRequest');

const updateRepositoryBodySchema = z
  .object({
    name: repositoryNameSchema.optional(),
    description: z.string().trim().max(500).nullable().optional().openapi({
      description: 'New description. Use null to remove the current description.',
      example: 'Updated project description',
    }),
    isPrivate: z.boolean().optional(),
  })
  .openapi('UpdateRepositoryRequest');

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
  400: jsonResponse('Invalid request data or parameters.', repositoryErrorSchema),
  401: jsonResponse('Authentication is required or invalid.', repositoryErrorSchema),
  403: jsonResponse('You do not have permission to perform this action.', repositoryErrorSchema),
  404: jsonResponse('Repository or user was not found.', repositoryErrorSchema),
  409: jsonResponse('A repository with this name already exists.', repositoryErrorSchema),
  500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
};

// Create repository
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories',
  tags: ['Repositories'],
  operationId: 'createRepository',
  summary: 'Create a repository',
  description:
    'Creates a repository for the authenticated user and initializes its Git repository. Repositories are public by default.',
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createRepositoryBodySchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Repository created successfully.', repositoryResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    409: commonErrors[409],
    500: commonErrors[500],
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories',
  tags: ['Repositories'],
  summary: 'List my repositories',
  description:
    'Returns all public and private personal repositories owned by the authenticated user. Organization repositories are excluded.',
  security: bearerSecurity,
  operationId: 'listMyRepositories',
  responses: {
    200: jsonResponse('Repositories retrieved successfully', repositoryListResponseSchema),
    401: commonErrors[401],
    500: commonErrors[500],
  },
});

// List public repositories
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}',
  tags: ['Repositories'],
  operationId: 'listUserRepositories',
  summary: 'List public repositories of a user',
  description:
    'Returns the authenticated-independent list of public repositories owned by the specified user. Private and organization repositories are excluded.',
  request: {
    params: usernameParamSchema,
  },
  responses: {
    200: jsonResponse('Public repositories retrieved successfully.', repositoryListResponseSchema),
    400: commonErrors[400],
    500: commonErrors[500],
  },
});

// Get repository
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}',
  tags: ['Repositories'],
  operationId: 'getRepository',
  summary: 'Get a repository',
  description:
    'Returns a public repository and its owner information. Private repositories are not returned by this endpoint.',
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository retrieved successfully.', repositoryWithOwnerResponseSchema),
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Update repository
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}',
  tags: ['Repositories'],
  operationId: 'updateRepository',
  summary: 'Update a repository',
  description:
    'Updates the name, description, or visibility of a repository. Only the repository owner can perform this operation. Renaming also renames the underlying Git repository.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateRepositoryBodySchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Repository updated successfully.', repositoryResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: commonErrors[409],
    500: commonErrors[500],
  },
});

// Delete repository
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}',
  tags: ['Repositories'],
  operationId: 'deleteRepository',
  summary: 'Delete a repository',
  description:
    'Deletes a repository owned by the authenticated user, including its Git repository data.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository deleted successfully.', repositoryMessageResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
