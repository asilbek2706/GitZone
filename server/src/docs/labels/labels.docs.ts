import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

import {
  createLabelSchema,
  updateLabelSchema,
  labelIdSchema,
} from '../../validations/labels/label.validation.js';

import {
  assignLabelSchema,
} from '../../validations/labels/label-assignment.validation.js';

extendZodWithOpenApi(z);

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

type RegisterOptions = Partial<Pick<PathConfig, 'security' | 'request' | 'responses'>>;

const paramsSchema = z.object({
  username: z.string(),
  name: z.string(),
});

const labelParamsSchema = paramsSchema.extend({
  labelId: labelIdSchema,
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
    tags: ['Labels'],
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

// Repository labels

registerPath(`${base}/labels`, 'post', 'createLabel', 'Create a repository label', {
  request: {
    params: paramsSchema,
    body: {
      content: {
        'application/json': {
          schema: createLabelSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Label created'),
  },
});

registerPath(`${base}/labels`, 'get', 'listLabels', 'List repository labels', {
  security: optionalBearerSecurity,
  request: { params: paramsSchema },
});

registerPath(`${base}/labels/{labelId}`, 'get', 'getLabel', 'Get a repository label', {
  security: optionalBearerSecurity,
  request: { params: labelParamsSchema },
});

registerPath(`${base}/labels/{labelId}`, 'patch', 'updateLabel', 'Update a repository label', {
  request: {
    params: labelParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateLabelSchema,
        },
      },
    },
  },
});

registerPath(`${base}/labels/{labelId}`, 'delete', 'deleteLabel', 'Delete a repository label', {
  request: { params: labelParamsSchema },
  responses: {
    204: { description: 'Label deleted' },
  },
});

// Issue label assignments

registerPath(`${base}/issues/{number}/labels`, 'post', 'createIssueLabel', 'Add a label to an issue', {
  request: {
    params: issueParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: assignLabelSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Label assigned to issue'),
  },
});

registerPath(`${base}/issues/{number}/labels/{labelId}`, 'delete', 'deleteIssueLabel', 'Remove a label from an issue', {
  request: {
    params: issueParamsSchema.extend({ labelId: labelIdSchema }),
  },
  responses: {
    204: { description: 'Label removed from issue' },
  },
});

// Pull request label assignments

registerPath(`${base}/pulls/{number}/labels`, 'post', 'createPullRequestLabel', 'Add a label to a pull request', {
  request: {
    params: pullRequestParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: assignLabelSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Label assigned to pull request'),
  },
});

registerPath(`${base}/pulls/{number}/labels/{labelId}`, 'delete', 'deletePullRequestLabel', 'Remove a label from a pull request', {
  request: {
    params: pullRequestParamsSchema.extend({ labelId: labelIdSchema }),
  },
  responses: {
    204: { description: 'Label removed from pull request' },
  },
});

