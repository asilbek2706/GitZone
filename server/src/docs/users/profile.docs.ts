import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';

extendZodWithOpenApi(z);

const errorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('ProfileError');

const publicUserProfileSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable(),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    location: z.string().nullable(),
    website: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('PublicUserProfile');

const profileResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: publicUserProfileSchema,
    }),
  })
  .openapi('ProfileResponse');

const updateProfileRequestSchema = z
  .strictObject({
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    name: z.string().trim().min(1).max(100).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    location: z.string().trim().max(100).nullable().optional(),
    website: z.string().trim().max(2048).url().nullable().optional(),
  })
  .openapi('UpdateProfileRequest');

const profileActivitySchema = z
  .object({
    id: z.string(),
    type: z.enum(['REPOSITORY_CREATED', 'ISSUE_CREATED', 'PULL_REQUEST_CREATED']),
    repository: z.object({
      id: z.string(),
      name: z.string(),
    }),
    number: z.number().int().nullable(),
    title: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('ProfileActivity');

const profileActivityResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      activities: z.array(profileActivitySchema),
    }),
  })
  .openapi('ProfileActivityResponse');

const contributionBreakdownSchema = z
  .object({
    repositories: z.number().int(),
    issues: z.number().int(),
    pullRequests: z.number().int(),
  })
  .openapi('ContributionBreakdown');

const contributionDaySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    count: z.number().int(),
  })
  .openapi('ContributionDay');

const profileContributionsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      total: z.number().int(),
      activeDays: z.number().int(),
      longestStreak: z.number().int(),
      currentStreak: z.number().int(),
      breakdown: contributionBreakdownSchema,
      days: z.array(contributionDaySchema),
    }),
  })
  .openapi('ProfileContributionsResponse');

const starredRepositorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isPrivate: z.boolean(),
    defaultBranch: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    owner: z.object({
      id: z.string(),
      username: z.string(),
      name: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    }),
    starredAt: z.string().datetime(),
  })
  .openapi('StarredRepository');

const starredRepositoriesResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositories: z.array(starredRepositorySchema),
      pagination: z.object({
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
        totalPages: z.number().int(),
      }),
    }),
  })
  .openapi('StarredRepositoriesResponse');

const profileUsernameParamsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

const starredQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const commonErrors = {
  400: jsonResponse('Invalid request or validation error.', errorSchema),
  401: jsonResponse('Authentication is required.', errorSchema),
  404: jsonResponse('Requested user or resource was not found.', errorSchema),
  500: jsonResponse('Unexpected server error.', errorSchema),
};

const bearerSecurity = [{ BearerAuth: [] }];

// Get public profile
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/{username}',
  tags: ['Users'],
  operationId: 'getUserProfile',
  summary: 'Get public user profile',
  description: 'Returns the public profile information of a user.',
  request: {
    params: profileUsernameParamsSchema,
  },
  responses: {
    200: jsonResponse('User profile retrieved successfully.', profileResponseSchema),
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Update current user profile
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/users/me',
  tags: ['Users'],
  operationId: 'updateUserProfile',
  summary: 'Update current user profile',
  description:
    'Updates one or more profile fields. At least one field must be provided. Website URLs must use HTTPS.',
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Profile updated successfully.', profileResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    404: commonErrors[404],
    409: jsonResponse('Username is already in use.', errorSchema),
    500: commonErrors[500],
  },
});

// Get public profile activity
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/{username}/activity',
  tags: ['Users'],
  operationId: 'getUserProfileActivity',
  summary: 'Get user public activity',
  description:
    'Returns up to 30 recent activities from the user public repositories, issues, and pull requests.',
  request: {
    params: profileUsernameParamsSchema,
  },
  responses: {
    200: jsonResponse('Profile activity retrieved successfully.', profileActivityResponseSchema),
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Get profile contributions
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/{username}/contributions',
  tags: ['Users'],
  operationId: 'getUserProfileContributions',
  summary: 'Get user contribution statistics',
  description:
    'Returns daily contribution counts and summary statistics for the last 365 UTC days.',
  request: {
    params: profileUsernameParamsSchema,
  },
  responses: {
    200: jsonResponse(
      'Contribution statistics retrieved successfully.',
      profileContributionsResponseSchema,
    ),
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Get starred repositories
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/{username}/starred',
  tags: ['Users'],
  operationId: 'getUserStarredRepositories',
  summary: 'Get user starred repositories',
  description:
    'Returns repositories starred by the specified user. Private repositories are included only when visible to the authenticated viewer.',
  security: [{}, ...bearerSecurity],
  request: {
    params: profileUsernameParamsSchema,
    query: starredQuerySchema,
  },
  responses: {
    200: jsonResponse(
      'Starred repositories retrieved successfully.',
      starredRepositoriesResponseSchema,
    ),
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Upload profile avatar
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/users/me/avatar',
  tags: ['Users'],
  operationId: 'uploadProfileAvatar',
  summary: 'Upload profile avatar',
  description:
    'Uploads an avatar using the multipart form field "avatar". Accepted formats are JPEG, PNG, and WebP. Maximum upload size is 5 MB. The stored image is converted to WebP.',
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: z.object({
            avatar: z.any().openapi({
              type: 'string',
              format: 'binary',
              description: 'Avatar image file.',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Avatar uploaded successfully.', profileResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    413: jsonResponse('Avatar file exceeds the 5 MB limit.', errorSchema),
    415: jsonResponse('Unsupported avatar file type.', errorSchema),
    500: commonErrors[500],
  },
});

// Read stored profile avatar
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/avatars/{filename}',
  tags: ['Users'],
  operationId: 'getProfileAvatar',
  summary: 'Get profile avatar image',
  description: 'Returns a stored avatar as a WebP image. The response is cached for 24 hours.',
  request: {
    params: z.object({
      filename: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Avatar image retrieved successfully.',
      content: {
        'image/webp': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      headers: {
        'X-Content-Type-Options': {
          description: 'Prevents MIME type sniffing.',
          schema: { type: 'string', example: 'nosniff' },
        },
        'Cache-Control': {
          description: 'Avatar cache policy.',
          schema: { type: 'string', example: 'public, max-age=86400, immutable' },
        },
      },
    },
    400: commonErrors[400],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
