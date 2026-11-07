import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

import {
  createOrganizationSchema,
  organizationSlugSchema,
  updateOrganizationProfileSchema,
  inviteOrganizationMemberSchema,
} from '../../validations/organizations/organization.validation.js';

import { createRepositorySchema } from '../../validations/repositories/repository.validation.js';

extendZodWithOpenApi(z);

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

type RegisterOptions = Partial<Pick<PathConfig, 'security' | 'request' | 'responses'>>;

const slugParamsSchema = z.object({
  slug: organizationSlugSchema,
});

const invitationParamsSchema = z.object({
  invitationId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const memberParamsSchema = slugParamsSchema.extend({
  userId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const transferOwnershipSchema = z.strictObject({
  targetUserId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const organizationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({}).passthrough(),
  message: z.string().optional(),
});

const organizationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    organization: organizationSchema,
  }),
});

const ownersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    owners: z.array(userSchema),
  }),
});

const membersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    members: z.array(
      userSchema.extend({
        role: z.enum(['OWNER', 'MEMBER']),
        joinedAt: z.string().datetime(),
      }),
    ),
  }),
});

const jsonResponse = (
  description: string,
  schema: z.ZodType = successEnvelopeSchema,
) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const commonErrors = {
  400: { description: 'Invalid request data' },
  401: { description: 'Authentication required' },
  403: { description: 'Permission denied' },
  404: { description: 'Resource not found' },
  409: { description: 'Resource conflict' },
  410: { description: 'Resource has expired' },
  500: { description: 'Internal server error' },
};

const bearerSecurity = [{ BearerAuth: [] }];
const optionalBearerSecurity = [{ BearerAuth: [] }, {}];

const base = '/api/organizations';

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
    tags: ['Organizations'],
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

// Organization management

registerPath(base, 'post', 'createOrganization', 'Create an organization', {
  request: {
    body: {
      content: {
        'application/json': {
          schema: createOrganizationSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Organization created', organizationResponseSchema),
  },
});

registerPath(
  `${base}/{slug}`,
  'get',
  'getOrganizationProfile',
  'Get an organization profile',
  {
    security: optionalBearerSecurity,
    request: {
      params: slugParamsSchema,
    },
    responses: {
      200: jsonResponse('Organization profile retrieved', organizationResponseSchema),
    },
  },
);

registerPath(
  `${base}/{slug}`,
  'patch',
  'updateOrganizationProfile',
  'Update an organization profile',
  {
    request: {
      params: slugParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateOrganizationProfileSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse('Organization profile updated', organizationResponseSchema),
    },
  },
);

// Organization members and owners

registerPath(
  `${base}/{slug}/owners`,
  'get',
  'listOrganizationOwners',
  'List organization owners',
  {
    security: optionalBearerSecurity,
    request: {
      params: slugParamsSchema,
    },
    responses: {
      200: jsonResponse('Organization owners retrieved', ownersResponseSchema),
    },
  },
);

registerPath(
  `${base}/{slug}/members`,
  'get',
  'listOrganizationMembers',
  'List organization members',
  {
    security: optionalBearerSecurity,
    request: {
      params: slugParamsSchema,
    },
    responses: {
      200: jsonResponse('Organization members retrieved', membersResponseSchema),
    },
  },
);

registerPath(
  `${base}/{slug}/members/{userId}`,
  'delete',
  'removeOrganizationMember',
  'Remove a member from an organization',
  {
    request: {
      params: memberParamsSchema,
    },
    responses: {
      200: jsonResponse('Organization member removed'),
    },
  },
);

registerPath(
  `${base}/{slug}/leave`,
  'post',
  'leaveOrganization',
  'Leave an organization',
  {
    request: {
      params: slugParamsSchema,
    },
    responses: {
      200: jsonResponse('Successfully left the organization'),
    },
  },
);

registerPath(
  `${base}/{slug}/ownership/transfer`,
  'post',
  'transferOrganizationOwnership',
  'Transfer organization ownership',
  {
    request: {
      params: slugParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: transferOwnershipSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse('Organization ownership transferred'),
    },
  },
);

// Organization invitations

registerPath(
  `${base}/{slug}/invitations`,
  'post',
  'inviteOrganizationMember',
  'Invite a user to an organization',
  {
    request: {
      params: slugParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: inviteOrganizationMemberSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Organization invitation created'),
    },
  },
);

registerPath(
  `${base}/invitations/{invitationId}/accept`,
  'post',
  'acceptOrganizationInvitation',
  'Accept an organization invitation',
  {
    request: {
      params: invitationParamsSchema,
    },
    responses: {
      200: jsonResponse('Organization invitation accepted'),
    },
  },
);

// Organization repositories

registerPath(
  `${base}/{slug}/repositories`,
  'post',
  'createOrganizationRepository',
  'Create a repository in an organization',
  {
    request: {
      params: slugParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: createRepositorySchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Organization repository created'),
    },
  },
);
