import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../../config/openapi.registry.js';

extendZodWithOpenApi(z);

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

type RegisterOptions = Partial<Pick<PathConfig, 'security' | 'request' | 'responses'>>;

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
    tags: ['Pull Requests'],
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

// Pull Requests

registerPath(base, 'post', 'createPullRequest', 'Create a pull request', {
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
});

registerPath(base, 'get', 'listPullRequests', 'List repository pull requests', {
  security: optionalBearerSecurity,
  request: {
    params: paramsSchema,
    query: listPullRequestsQuerySchema,
  },
});

registerPath(`${base}/{number}`, 'get', 'getPullRequest', 'Get a pull request', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}`, 'patch', 'updatePullRequest', 'Update a pull request', {
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
});

registerPath(`${base}/{number}/commits`, 'get', 'getPullRequestCommits', 'List pull request commits', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}/diff`, 'get', 'getPullRequestDiff', 'Get pull request diff', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}/mergeability`, 'get', 'getPullRequestMergeability', 'Check pull request mergeability', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}/merge`, 'post', 'mergePullRequest', 'Merge a pull request', {
  request: { params: pullRequestParamsSchema },
});

// Reviews

registerPath(`${base}/{number}/reviews`, 'post', 'submitPullRequestReview', 'Submit a pull request review', {
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
});

registerPath(`${base}/{number}/reviews`, 'get', 'listPullRequestReviews', 'List pull request reviews', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}/review-state`, 'get', 'getPullRequestReviewState', 'Get pull request review state', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

// Comments and conversations

registerPath(`${base}/{number}/comments`, 'post', 'createPullRequestComment', 'Create a pull request comment', {
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
});

registerPath(`${base}/{number}/conversations`, 'get', 'listPullRequestConversations', 'List pull request conversations', {
  security: optionalBearerSecurity,
  request: { params: pullRequestParamsSchema },
});

registerPath(`${base}/{number}/inline-comments`, 'post', 'createPullRequestInlineComment', 'Create an inline pull request comment', {
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
});

registerPath(`${base}/{number}/comments/{commentId}`, 'patch', 'updatePullRequestComment', 'Update a pull request comment', {
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
});

registerPath(`${base}/{number}/comments/{commentId}`, 'delete', 'deletePullRequestComment', 'Delete a pull request comment', {
  request: { params: commentParamsSchema },
  responses: {
    204: { description: 'Comment deleted' },
  },
});

registerPath(`${base}/{number}/conversations/{conversationId}/comments`, 'post', 'createPullRequestConversationComment', 'Reply to a pull request conversation', {
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
});

registerPath(`${base}/{number}/conversations/{conversationId}/resolve`, 'post', 'resolvePullRequestConversation', 'Resolve a pull request conversation', {
  request: { params: conversationParamsSchema },
});

registerPath(`${base}/{number}/conversations/{conversationId}/reopen`, 'post', 'reopenPullRequestConversation', 'Reopen a pull request conversation', {
  request: { params: conversationParamsSchema },
});

