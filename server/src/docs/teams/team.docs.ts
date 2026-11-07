import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from '../../validations/organizations/team.validation.js';

import {
  addTeamRepositorySchema,
  updateTeamRepositorySchema,
} from '../../validations/organizations/team-repository.validation.js';

import { organizationSlugSchema } from '../../validations/organizations/organization.validation.js';

extendZodWithOpenApi(z);

const base = '/organizations';

const bearerSecurity = [{ bearerAuth: [] }];

const commonErrors = {
  400: { description: 'Invalid request data' },
  401: { description: 'Authentication required' },
  403: { description: 'Organization owner permission required' },
  404: { description: 'Resource not found' },
  409: { description: 'Resource conflict' },
};

const slugParamsSchema = z.object({
  slug: organizationSlugSchema,
});

const teamParamsSchema = slugParamsSchema.extend({
  teamId: z.string().trim().min(1).max(64),
});

const teamMemberParamsSchema = teamParamsSchema.extend({
  userId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

const teamRepositoryParamsSchema = teamParamsSchema.extend({
  repositoryId: z.string().trim().min(1),
});

const teamSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const teamMemberSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  user: userSchema,
});

const teamRepositorySchema = z.object({
  id: z.string(),
  teamId: z.string(),
  repositoryId: z.string(),
  permission: z.enum(['READ', 'WRITE']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const teamRepositoryWithDetailsSchema = teamRepositorySchema.extend({
  repository: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isPrivate: z.boolean(),
  }),
});

const successResponse = (data: z.ZodType) =>
  z.object({
    success: z.literal(true),
    data,
  });

const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

const registerTeamPath = (
  path: string,
  method: PathConfig['method'],
  operationId: string,
  summary: string,
  request?: PathConfig['request'],
  successStatus = 200,
  responseSchema: z.ZodType = successResponse(z.object({}).passthrough()),
) => {
  openApiRegistry.registerPath({
    method,
    path,
    tags: ['Teams'],
    operationId,
    summary,
    security: bearerSecurity,
    ...(request ? { request } : {}),
    responses: {
      [successStatus]: jsonResponse('Successful response', responseSchema),
      ...commonErrors,
    },
  });
};

// Team CRUD

registerTeamPath(
  `${base}/{slug}/teams`,
  'post',
  'createTeam',
  'Create a team',
  {
    params: slugParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: createTeamSchema,
        },
      },
    },
  },
  201,
  successResponse(z.object({ team: teamSchema })),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}`,
  'patch',
  'updateTeam',
  'Update a team',
  {
    params: teamParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateTeamSchema,
        },
      },
    },
  },
  200,
  successResponse(z.object({ team: teamSchema })),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}`,
  'delete',
  'deleteTeam',
  'Delete a team',
  {
    params: teamParamsSchema,
  },
  200,
  successResponse(
    z.object({
      team: z.object({ id: z.string() }),
    }),
  ),
);

// Team Members

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/members`,
  'post',
  'addTeamMember',
  'Add a member to a team',
  {
    params: teamParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: addTeamMemberSchema,
        },
      },
    },
  },
  201,
  successResponse(z.object({ member: teamMemberSchema })),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/members/{userId}`,
  'delete',
  'removeTeamMember',
  'Remove a member from a team',
  {
    params: teamMemberParamsSchema,
  },
  200,
);

// Team Repository Access

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/repositories`,
  'post',
  'addTeamRepository',
  'Grant a team access to a repository',
  {
    params: teamParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: addTeamRepositorySchema,
        },
      },
    },
  },
  201,
  successResponse(z.object({ access: teamRepositorySchema })),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/repositories`,
  'get',
  'listTeamRepositories',
  'List team repositories',
  {
    params: teamParamsSchema,
  },
  200,
  successResponse(
    z.object({
      repositories: z.array(teamRepositoryWithDetailsSchema),
    }),
  ),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/repositories/{repositoryId}`,
  'patch',
  'updateTeamRepository',
  'Update team repository permission',
  {
    params: teamRepositoryParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateTeamRepositorySchema,
        },
      },
    },
  },
  200,
  successResponse(z.object({ access: teamRepositorySchema })),
);

registerTeamPath(
  `${base}/{slug}/teams/{teamId}/repositories/{repositoryId}`,
  'delete',
  'removeTeamRepository',
  'Remove team repository access',
  {
    params: teamRepositoryParamsSchema,
  },
  200,
);
