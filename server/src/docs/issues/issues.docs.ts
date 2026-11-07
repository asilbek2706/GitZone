import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';

extendZodWithOpenApi(z);

// ============================================================
// SHARED SCHEMAS
// ============================================================

const issueUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
}).openapi('IssueUser');

const issueLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
}).openapi('IssueLabel');

const issueMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(['OPEN', 'CLOSED']),
  dueDate: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
}).openapi('IssueMilestone');

const issueSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  number: z.number().int(),
  creatorId: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['OPEN', 'CLOSED']),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  creator: issueUserSchema,
  labels: z.array(z.object({
    label: issueLabelSchema,
  })).optional(),
  milestone: issueMilestoneSchema.nullable().optional(),
}).openapi('Issue');

const issueAssigneeSchema = z.object({
  issueId: z.string(),
  userId: z.string(),
  assignedAt: z.string().datetime(),
  user: issueUserSchema,
}).openapi('IssueAssignee');

const issueCommentSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: issueUserSchema,
}).openapi('IssueComment');

const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
}).openapi('IssuePagination');

// ============================================================
// REQUEST SCHEMAS
// ============================================================

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

const issueParamsSchema = repositoryParamsSchema.extend({
  number: z.number().int().positive().openapi({
    description: 'Issue number.',
    example: 1,
  }),
});

const commentParamsSchema = issueParamsSchema.extend({
  commentId: z.string().min(1).max(128).openapi({
    description: 'Issue comment identifier.',
    example: 'cm123456789',
  }),
});

const assigneeParamsSchema = issueParamsSchema.extend({
  assigneeUsername: z.string().min(1).max(100).openapi({
    description: 'Username of the assignee.',
    example: 'john',
  }),
});

const createIssueRequestSchema = z.object({
  title: z.string().trim().min(1).max(256).openapi({
    description: 'Issue title.',
    example: 'Fix authentication bug',
  }),
  body: z.string().trim().max(10000).nullable().optional().openapi({
    description: 'Optional issue description.',
    example: 'Users cannot sign in after refreshing the page.',
  }),
}).openapi('CreateIssueRequest');

const updateIssueRequestSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  body: z.string().trim().max(10000).nullable().optional(),
  state: z.enum(['OPEN', 'CLOSED']).optional(),
}).refine(
  (data) =>
    data.title !== undefined ||
    data.body !== undefined ||
    data.state !== undefined,
  { message: 'At least one issue field is required' },
).openapi('UpdateIssueRequest');

const listIssuesQuerySchema = z.object({
  state: z.enum(['OPEN', 'CLOSED']).optional().openapi({
    description: 'Filter issues by state.',
    example: 'OPEN',
  }),
  page: z.coerce.number().int().min(1).max(100000).default(1).openapi({
    description: 'Page number.',
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    description: 'Number of issues per page.',
    example: 20,
  }),
}).openapi('ListIssuesQuery');

const addAssigneeRequestSchema = z.object({
  username: z.string().trim().min(1).max(100).openapi({
    description: 'Username of the user to assign.',
    example: 'john',
  }),
}).openapi('AddIssueAssigneeRequest');

const createCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(10000).openapi({
    description: 'Comment content.',
    example: 'I can reproduce this issue.',
  }),
}).openapi('CreateIssueCommentRequest');

const updateCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(10000).openapi({
    description: 'Updated comment content.',
    example: 'Updated comment text.',
  }),
}).openapi('UpdateIssueCommentRequest');

const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).openapi('ListIssueCommentsQuery');

// ============================================================
// RESPONSE SCHEMAS
// ============================================================

const issueResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    issue: issueSchema,
  }),
}).openapi('IssueResponse');

const issueListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    issues: z.array(issueSchema),
    pagination: paginationSchema,
  }),
}).openapi('IssueListResponse');

const issueAssigneeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    assignee: issueAssigneeSchema,
  }),
}).openapi('IssueAssigneeResponse');

const issueAssigneeListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    assignees: z.array(issueAssigneeSchema),
  }),
}).openapi('IssueAssigneeListResponse');

const issueCommentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    comment: issueCommentSchema,
  }),
}).openapi('IssueCommentResponse');

const issueCommentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    comments: z.array(issueCommentSchema),
    pagination: paginationSchema,
  }),
}).openapi('IssueCommentListResponse');

const deletedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    deleted: z.literal(true),
  }),
}).openapi('IssueDeletedResponse');

const issueErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
}).openapi('IssueError');

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const bearerSecurity = [{ BearerAuth: [] }];
const optionalBearerSecurity = [{ BearerAuth: [] }, {}];

const commonErrors = {
  400: jsonResponse('Invalid request data or parameters.', issueErrorSchema),
  401: jsonResponse('Authentication is required or invalid.', issueErrorSchema),
  403: jsonResponse('You do not have permission to perform this action.', issueErrorSchema),
  404: jsonResponse('Repository, issue, or user was not found.', issueErrorSchema),
  409: jsonResponse('The requested resource already exists.', issueErrorSchema),
  500: jsonResponse('Unexpected server error.', issueErrorSchema),
};

// ============================================================
// ISSUES
// ============================================================

// Create issue
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/issues',
  tags: ['Issues'],
  operationId: 'createIssue',
  summary: 'Create an issue',
  description: 'Creates a new issue in the specified repository. Requires repository WRITE permission.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createIssueRequestSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Issue created successfully.', issueResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// List issues
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/issues',
  tags: ['Issues'],
  operationId: 'listIssues',
  summary: 'List repository issues',
  description: 'Returns a paginated list of issues. Supports filtering by OPEN or CLOSED state. Authentication is optional.',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: listIssuesQuerySchema,
  },
  responses: {
    200: jsonResponse('Issues retrieved successfully.', issueListResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Get issue
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/issues/{number}',
  tags: ['Issues'],
  operationId: 'getIssue',
  summary: 'Get an issue',
  description: 'Returns a single issue by its repository issue number. Authentication is optional.',
  security: optionalBearerSecurity,
  request: {
    params: issueParamsSchema,
  },
  responses: {
    200: jsonResponse('Issue retrieved successfully.', issueResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Update issue
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}/issues/{number}',
  tags: ['Issues'],
  operationId: 'updateIssue',
  summary: 'Update an issue',
  description: 'Updates an issue title, body, or state. Requires repository WRITE permission.',
  security: bearerSecurity,
  request: {
    params: issueParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateIssueRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Issue updated successfully.', issueResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// ============================================================
// ISSUE ASSIGNEES
// ============================================================

// Add assignee
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/issues/{number}/assignees',
  tags: ['Issues'],
  operationId: 'addIssueAssignee',
  summary: 'Add an issue assignee',
  description: 'Assigns an existing repository owner or collaborator to an issue. Requires repository WRITE permission.',
  security: bearerSecurity,
  request: {
    params: issueParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: addAssigneeRequestSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Assignee added successfully.', issueAssigneeResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: commonErrors[409],
    500: commonErrors[500],
  },
});

// List assignees
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/issues/{number}/assignees',
  tags: ['Issues'],
  operationId: 'listIssueAssignees',
  summary: 'List issue assignees',
  description: 'Returns users assigned to the specified issue. Authentication is optional.',
  security: optionalBearerSecurity,
  request: {
    params: issueParamsSchema,
  },
  responses: {
    200: jsonResponse('Assignees retrieved successfully.', issueAssigneeListResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Remove assignee
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/issues/{number}/assignees/{assigneeUsername}',
  tags: ['Issues'],
  operationId: 'removeIssueAssignee',
  summary: 'Remove an issue assignee',
  description: 'Removes a user assignment from an issue. Requires repository WRITE permission.',
  security: bearerSecurity,
  request: {
    params: assigneeParamsSchema,
  },
  responses: {
    200: jsonResponse('Assignee removed successfully.', deletedResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// ============================================================
// ISSUE COMMENTS
// ============================================================

// Create comment
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/issues/{number}/comments',
  tags: ['Issues'],
  operationId: 'createIssueComment',
  summary: 'Create an issue comment',
  description: 'Creates a comment on an issue. Requires authentication.',
  security: bearerSecurity,
  request: {
    params: issueParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createCommentRequestSchema,
        },
      },
    },
  },
  responses: {
    201: jsonResponse('Comment created successfully.', issueCommentResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// List comments
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/issues/{number}/comments',
  tags: ['Issues'],
  operationId: 'listIssueComments',
  summary: 'List issue comments',
  description: 'Returns paginated comments for an issue. Authentication is optional.',
  security: optionalBearerSecurity,
  request: {
    params: issueParamsSchema,
    query: listCommentsQuerySchema,
  },
  responses: {
    200: jsonResponse('Comments retrieved successfully.', issueCommentListResponseSchema),
    400: commonErrors[400],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Update comment
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}/issues/{number}/comments/{commentId}',
  tags: ['Issues'],
  operationId: 'updateIssueComment',
  summary: 'Update an issue comment',
  description: 'Updates a comment. Only the comment author or repository owner can perform this operation.',
  security: bearerSecurity,
  request: {
    params: commentParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateCommentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Comment updated successfully.', issueCommentResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});

// Delete comment
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/issues/{number}/comments/{commentId}',
  tags: ['Issues'],
  operationId: 'deleteIssueComment',
  summary: 'Delete an issue comment',
  description: 'Deletes a comment. Only the comment author or repository owner can perform this operation.',
  security: bearerSecurity,
  request: {
    params: commentParamsSchema,
  },
  responses: {
    200: jsonResponse('Comment deleted successfully.', deletedResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    500: commonErrors[500],
  },
});
