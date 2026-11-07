import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';

extendZodWithOpenApi(z);

const healthResponseSchema = z.object({
  success: z.literal(true),
  service: z.literal('gitzone-server'),
  status: z.literal('healthy'),
}).openapi('HealthResponse');

const livenessResponseSchema = z.object({
  success: z.literal(true),
  service: z.literal('gitzone-server'),
  status: z.literal('alive'),
}).openapi('LivenessResponse');

const readinessResponseSchema = z.object({
  success: z.literal(true),
  service: z.literal('gitzone-server'),
  status: z.literal('ready'),
  database: z.literal('connected'),
}).openapi('ReadinessResponse');

const readinessErrorSchema = z.object({
  success: z.literal(false),
  service: z.literal('gitzone-server'),
  status: z.literal('not_ready'),
  database: z.literal('disconnected'),
}).openapi('ReadinessErrorResponse');

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Health'],
  operationId: 'getHealth',
  summary: 'Get API health status',
  description: 'Returns the general health status of the GitZone API.',
  responses: {
    200: {
      description: 'Service is healthy.',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/health/live',
  tags: ['Health'],
  operationId: 'getLiveness',
  summary: 'Check service liveness',
  description: 'Checks whether the application process is alive.',
  responses: {
    200: {
      description: 'Service is alive.',
      content: {
        'application/json': {
          schema: livenessResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/health/ready',
  tags: ['Health'],
  operationId: 'getReadiness',
  summary: 'Check service readiness',
  description: 'Checks whether the application and its database are ready to serve requests.',
  responses: {
    200: {
      description: 'Service and database are ready.',
      content: {
        'application/json': {
          schema: readinessResponseSchema,
        },
      },
    },
    503: {
      description: 'Service is not ready because the database is disconnected.',
      content: {
        'application/json': {
          schema: readinessErrorSchema,
        },
      },
    },
  },
});
