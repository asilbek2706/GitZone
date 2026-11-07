import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import { repositoryErrorSchema } from './repository.schemas.js';
import { repositoryWatchPreferenceSchema } from '../../validations/repositories/repository-watch-preferences.validation.js';

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

const watchActionResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositoryId: z.string(),
      watching: z.boolean(),
    }),
  })
  .openapi('RepositoryWatchActionResponse');

const watchPreferenceResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositoryId: z.string(),
      watching: z.literal(true),
      preference: repositoryWatchPreferenceSchema,
    }),
  })
  .openapi('RepositoryWatchPreferenceResponse');

const watcherCountResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositoryId: z.string(),
      watcherCount: z.number().int().nonnegative(),
    }),
  })
  .openapi('RepositoryWatcherCountResponse');

const updateWatchPreferenceRequestSchema = z
  .object({
    preference: repositoryWatchPreferenceSchema,
  })
  .openapi('UpdateRepositoryWatchPreferenceRequest');

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
  400: jsonResponse('Invalid repository parameters or watch preference.', repositoryErrorSchema),
  401: jsonResponse('Authentication is required or invalid.', repositoryErrorSchema),
  403: jsonResponse('You do not have permission to access this repository.', repositoryErrorSchema),
  404: jsonResponse('Repository or repository watch was not found.', repositoryErrorSchema),
  500: jsonResponse('Unexpected server error.', repositoryErrorSchema),
};

// Watch repository
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/watch',
  tags: ['Repositories'],
  operationId: 'watchRepository',
  summary: 'Watch a repository',
  description:
    'Starts watching a repository for the authenticated user. Repeated requests do not create duplicate watch records.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository watched successfully.', watchActionResponseSchema),
    ...commonErrors,
  },
});

// Unwatch repository
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/watch',
  tags: ['Repositories'],
  operationId: 'unwatchRepository',
  summary: 'Unwatch a repository',
  description:
    'Stops watching a repository for the authenticated user. The operation succeeds even if the user was not watching it.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository unwatched successfully.', watchActionResponseSchema),
    ...commonErrors,
  },
});

// Update repository watch preference
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}/watch/preferences',
  tags: ['Repositories'],
  operationId: 'updateRepositoryWatchPreference',
  summary: 'Update repository watch preference',
  description:
    'Updates notification preference for an existing repository watch. ALL receives all notifications, PARTICIPATING receives notifications for participating activity, and IGNORE disables notifications.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateWatchPreferenceRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Repository watch preference updated successfully.', watchPreferenceResponseSchema),
    ...commonErrors,
  },
});

// Get repository watcher count
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/watchers/count',
  tags: ['Repositories'],
  operationId: 'getRepositoryWatcherCount',
  summary: 'Get repository watcher count',
  description:
    'Returns the total number of users watching a repository. Authentication is optional; authenticated users may access repositories they are authorized to read.',
  request: {
    params: repositoryParamsSchema,
  },
  responses: {
    200: jsonResponse('Repository watcher count retrieved successfully.', watcherCountResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
