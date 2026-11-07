import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

extendZodWithOpenApi(z);

const paramsSchema = z.object({
  username: z.string(),
  name: z.string(),
});

const pullRequestParamsSchema = paramsSchema.extend({
  number: z.coerce.number().int().positive(),
});

const commentParamsSchema = pullRequestParamsSchema.extend({
  commentId: z.string(),
});

const conversationParamsSchema = pullRequestParamsSchema.extend({
  conversationId: z.string(),
});

const labelParamsSchema = pullRequestParamsSchema.extend({
  labelId: z.string(),
});

const createPullRequestSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(10000).nullable().optional(),
  sourceBranch: z.string().min(1).max(255),
  targetBranch: z.string().min(1).max(255),
});

const updatePullRequestSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(10000).nullable().optional(),
  state: z.enum(['OPEN', 'CLOSED']).optional(),
});

const listPullRequestsQuerySchema = z.object({
  state: z.enum(['OPEN', 'CLOSED', 'MERGED']).optional(),
});

const reviewSchema = z.object({
  state: z.enum(['COMMENTED', 'APPROVED', 'CHANGES_REQUESTED']),
  body: z.string().max(10000).nullable().optional(),
});

const commentSchema = z.object({
  body: z.string().min(1).max(10000),
});

const inlineCommentSchema = commentSchema.extend({
  path: z.string().min(1).max(4096),
  line: z.coerce.number().int().positive(),
  side: z.enum(['LEFT', 'RIGHT']),
});

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

const base = '/api/repositories/{username}/{name}/pulls';

const registerPullRequestPath = (
  path: string,
  method: 'get' | 'post' | 'patch' | 'delete',
  operationId: string,
  summary: string,
  tag: string,
  options: Record<string, any> = {},
) => {
  openApiRegistry.registerPath({
    method,
    path,
    tags: [tag],
    operationId,
    summary,
    security: options.security ?? bearerSecurity,
    request: options.request,
    responses: {
      ...(options.responses ?? {
        200: jsonResponse('Successful response'),
      }),
      ...commonErrors,
    },
  });
};

// Pull Requests

registerPullRequestPath(
  base,
  'post',
  'createPullRequest',
  'Create a pull request',
  'Pull Requests',
  {
    request: {
      params: paramsSchema,
      body: {
        content: {
          'application/json': {
            schema: createPullRequestSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Pull request created'),
    },
  },
);

registerPullRequestPath(
  base,
  'get',
  'listPullRequests',
  'List repository pull requests',
  'Pull Requests',
  {
    security: optionalBearerSecurity,
    request: {
      params: paramsSchema,
      query: listPullRequestsQuerySchema,
    },
  },
);

registerPullRequestPath(
  `${base}/{number}`,
  'get',
  'getPullRequest',
  'Get a pull request',
  'Pull Requests',
  {
    security: optionalBearerSecurity,
    request: { params: pullRequestParamsSchema },
  },
);

registerPullRequestPath(
  `${base}/{number}`,
  'patch',
  'updatePullRequest',
  'Update a pull request',
  'Pull Requests',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updatePullRequestSchema,
          },
        },
      },
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/commits`,
  'get',
  'getPullRequestCommits',
  'List pull request commits',
  'Pull Requests',
  { request: { params: pullRequestParamsSchema } },
);

registerPullRequestPath(
  `${base}/{number}/diff`,
  'get',
  'getPullRequestDiff',
  'Get pull request diff',
  'Pull Requests',
  { request: { params: pullRequestParamsSchema } },
);

registerPullRequestPath(
  `${base}/{number}/mergeability`,
  'get',
  'getPullRequestMergeability',
  'Check pull request mergeability',
  'Pull Requests',
  { request: { params: pullRequestParamsSchema } },
);

registerPullRequestPath(
  `${base}/{number}/merge`,
  'post',
  'mergePullRequest',
  'Merge a pull request',
  'Pull Requests',
  { request: { params: pullRequestParamsSchema } },
);

// Reviews

registerPullRequestPath(
  `${base}/{number}/reviews`,
  'post',
  'submitPullRequestReview',
  'Submit a pull request review',
  'Pull Requests',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: reviewSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Review submitted'),
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/reviews`,
  'get',
  'listPullRequestReviews',
  'List pull request reviews',
  'Pull Requests',
  {
    security: optionalBearerSecurity,
    request: { params: pullRequestParamsSchema },
  },
);

registerPullRequestPath(
  `${base}/{number}/review-state`,
  'get',
  'getPullRequestReviewState',
  'Get pull request review state',
  'Pull Requests',
  {
    security: optionalBearerSecurity,
    request: { params: pullRequestParamsSchema },
  },
);

// Review comments and conversations

registerPullRequestPath(
  `${base}/{number}/comments`,
  'post',
  'createPullRequestComment',
  'Create a pull request comment',
  'Pull Requests',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: commentSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Comment created'),
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/conversations`,
  'get',
  'listPullRequestConversations',
  'List pull request conversations',
  'Pull Requests',
  {
    security: optionalBearerSecurity,
    request: { params: pullRequestParamsSchema },
  },
);

registerPullRequestPath(
  `${base}/{number}/inline-comments`,
  'post',
  'createPullRequestInlineComment',
  'Create an inline pull request comment',
  'Pull Requests',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: inlineCommentSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Inline comment created'),
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/comments/{commentId}`,
  'patch',
  'updatePullRequestComment',
  'Update a pull request comment',
  'Pull Requests',
  {
    request: {
      params: commentParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: commentSchema,
          },
        },
      },
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/comments/{commentId}`,
  'delete',
  'deletePullRequestComment',
  'Delete a pull request comment',
  'Pull Requests',
  {
    request: { params: commentParamsSchema },
    responses: {
      204: { description: 'Comment deleted' },
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/conversations/{conversationId}/comments`,
  'post',
  'createPullRequestConversationComment',
  'Reply to a pull request conversation',
  'Pull Requests',
  {
    request: {
      params: conversationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: commentSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Conversation comment created'),
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/conversations/{conversationId}/resolve`,
  'post',
  'resolvePullRequestConversation',
  'Resolve a pull request conversation',
  'Pull Requests',
  { request: { params: conversationParamsSchema } },
);

registerPullRequestPath(
  `${base}/{number}/conversations/{conversationId}/reopen`,
  'post',
  'reopenPullRequestConversation',
  'Reopen a pull request conversation',
  'Pull Requests',
  { request: { params: conversationParamsSchema } },
);

// Pull request labels

registerPullRequestPath(
  `${base}/{number}/labels`,
  'post',
  'createPullRequestLabel',
  'Add a label to a pull request',
  'Labels',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: z.object({
              name: z.string().min(1),
            }),
          },
        },
      },
    },
    responses: {
      201: jsonResponse('Label added'),
    },
  },
);

registerPullRequestPath(
  `${base}/{number}/labels/{labelId}`,
  'delete',
  'deletePullRequestLabel',
  'Remove a label from a pull request',
  'Labels',
  { request: { params: labelParamsSchema } },
);

// Pull request milestones

registerPullRequestPath(
  `${base}/{number}/milestone`,
  'patch',
  'updatePullRequestMilestone',
  'Update a pull request milestone',
  'Milestones',
  {
    request: {
      params: pullRequestParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: z.object({
              milestoneId: z.string().nullable(),
            }),
          },
        },
      },
    },
  },
);
