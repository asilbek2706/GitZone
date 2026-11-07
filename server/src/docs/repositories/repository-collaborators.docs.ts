import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import {
  addRepositoryCollaboratorRequestSchema,
  repositoryCollaboratorListResponseSchema,
  repositoryCollaboratorResponseSchema,
  repositoryErrorSchema,
  repositoryMessageResponseSchema,
  updateRepositoryCollaboratorRequestSchema,
} from './repository.schemas.js';

const usernameParamSchema = z.object({
  username: z.string().min(1).openapi({
    description: 'Repository owner username.',
    example: 'asilbek',
  }),
});

const repositoryParamsSchema = usernameParamSchema.extend({
  name: z.string().min(1).openapi({
    description: 'Repository name.',
    example: 'gitzone',
  }),
});

const collaboratorParamsSchema = repositoryParamsSchema.extend({
  collaboratorUsername: z.string().min(1).openapi({
    description: 'Collaborator username.',
    example: 'john',
  }),
});

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
  403: jsonResponse('You do not have permission to manage collaborators.', repositoryErrorSchema),
  404: jsonResponse('Repository, user, or collaborator was not found.', repositoryErrorSchema),
  409: jsonResponse('User is already a repository collaborator.', repositoryErrorSchema),
  500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
};

// Add repository collaborator
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/collaborators',
  tags: ['Repositories'],
  operationId: 'addRepositoryCollaborator',
  summary: 'Add a repository collaborator',
  description:
    'Adds an existing user as a collaborator to a repository. Only the repository owner can manage collaborators. The repository owner cannot be added as a collaborator.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: addRepositoryCollaboratorRequestSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Collaborator added successfully.', repositoryCollaboratorResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: commonErrors[409],
    500: commonErrors[500],
  },
});

// List repository collaborators
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/collaborators',
  tags: ['Repositories'],
  operationId: 'listRepositoryCollaborators',
  summary: 'List repository collaborators',
  description:
    'Returns all collaborators of a repository, ordered by creation date. Only the repository owner can view the collaborator list.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse(
      'Repository collaborators retrieved successfully.',
      repositoryCollaboratorListResponseSchema,
    ),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Update repository collaborator permission
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}/collaborators/{collaboratorUsername}',
  tags: ['Repositories'],
  operationId: 'updateRepositoryCollaborator',
  summary: 'Update collaborator permission',
  description:
    'Updates a collaborator permission to READ or WRITE. Only the repository owner can perform this operation.',
  security: bearerSecurity,
  request: {
    params: collaboratorParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateRepositoryCollaboratorRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse(
      'Collaborator permission updated successfully.',
      repositoryCollaboratorResponseSchema,
    ),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Remove repository collaborator
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/collaborators/{collaboratorUsername}',
  tags: ['Repositories'],
  operationId: 'removeRepositoryCollaborator',
  summary: 'Remove a repository collaborator',
  description:
    'Removes a user from the repository collaborator list. Only the repository owner can perform this operation.',
  security: bearerSecurity,
  request: {
    params: collaboratorParamsSchema,
  },
  responses: {
    200: jsonResponse(
      'Repository collaborator removed successfully.',
      repositoryMessageResponseSchema,
    ),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
