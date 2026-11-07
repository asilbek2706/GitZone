import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

import {
  createMilestoneSchema,
  updateMilestoneSchema,
  listMilestonesQuerySchema,
  milestoneIdSchema,
} from '../../validations/milestones/milestone.validation.js';

import { assignMilestoneSchema } from '../../validations/milestones/milestone-assignment.validation.js';

extendZodWithOpenApi(z);

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

type RegisterOptions = Partial<Pick<PathConfig, 'security' | 'request' | 'responses'>>;

const paramsSchema = z.object({
  username: z.string(),
  name: z.string(),
});

const milestoneParamsSchema = paramsSchema.extend({
  milestoneId: milestoneIdSchema,
});

const issueParamsSchema = paramsSchema.extend({
  number: z.coerce.number().int().positive(),
});

const pullRequestParamsSchema = issueParamsSchema;

const responseSchema = z.object({}).passthrough();

const jsonResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: responseSchema,
    },
  },
});

const commonErrors = {
  400: { description: 'Invalid request data' },
  401: { description: 'Authentication required' },
  403: { description: 'Permission denied' },
  404: { description: 'Resource not found' },
  409: { description: 'Conflict' },
  500: { description: 'Internal server error' },
};

const bearerSecurity = [{ BearerAuth: [] }];
const optionalBearerSecurity = [{ BearerAuth: [] }, {}];

const base = '/api/repositories/{username}/{name}';

const registerPath = (
  path: string,
  method: PathConfig['method'],
  operationId: string,
  summary: string,
  options: RegisterOptions = {},
) => {
  openApiRegistry.registerPath({
    method,
    path,
    tags: ['Milestones'],
    operationId,
    summary,
    security: options.security ?? bearerSecurity,
    ...(options.request ? { request: options.request } : {}),
    responses: {
      ...(options.responses ?? {
        200: jsonResponse('Successful response'),
      }),
      ...commonErrors,
    },
  });
};

// Repository milestones

registerPath(`${base}/milestones`, 'post', 'createMilestone', 'Create a repository milestone', {
  request: {
    params: paramsSchema,
    body: {
      content: {
        'application/json': {
          schema: createMilestoneSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Milestone created'),
  },
});

registerPath(`${base}/milestones`, 'get', 'listMilestones', 'List repository milestones', {
  security: optionalBearerSecurity,
  request: {
    params: paramsSchema,
    query: listMilestonesQuerySchema,
  },
});

registerPath(
  `${base}/milestones/{milestoneId}`,
  'get',
  'getMilestone',
  'Get a repository milestone',
  {
    security: optionalBearerSecurity,
    request: { params: milestoneParamsSchema },
  },
);

registerPath(
  `${base}/milestones/{milestoneId}`,
  'patch',
  'updateMilestone',
  'Update a repository milestone',
  {
    request: {
      params: milestoneParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateMilestoneSchema,
          },
        },
      },
    },
  },
);

registerPath(
  `${base}/milestones/{milestoneId}`,
  'delete',
  'deleteMilestone',
  'Delete a repository milestone',
  {
    request: { params: milestoneParamsSchema },
    responses: {
      204: { description: 'Milestone deleted' },
    },
  },
);

// Issue milestone assignment

registerPath(
  `${base}/issues/{number}/milestone`,
  'patch',
  'updateIssueMilestone',
  'Assign or remove an issue milestone',
  {
    request: {
      params: issueParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: assignMilestoneSchema,
          },
        },
      },
    },
  },
);

// Pull request milestone assignment

registerPath(
  `${base}/pulls/{number}/milestone`,
  'patch',
  'updatePullRequestMilestone',
  'Assign or remove a pull request milestone',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: assignMilestoneSchema,
          },
        },
      },
    },
  },
);

