import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';
import { repositoryErrorSchema } from '../repositories/repository.schemas.js';

const repositoryParamsSchema = z.object({
  username: z.string().min(1).openapi({ example: 'asilbek' }),
  name: z.string().min(1).openapi({ example: 'gitzone' }),
});

const shaSchema = z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i);

const referenceSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  oid: z.string(),
  objectType: z.enum(['commit', 'tag', 'tree', 'blob']),
});

const branchSchema = referenceSchema.extend({
  isDefault: z.boolean(),
});

const refsSchema = z.object({
  objectFormat: z.enum(['sha1', 'sha256']),
  symbolicHead: z.string(),
  defaultBranch: z.string(),
  head: referenceSchema.nullable(),
  branches: z.array(referenceSchema),
  tags: z.array(referenceSchema),
});

const treeEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  mode: z.string(),
  objectType: z.enum(['blob', 'tree', 'commit']),
  oid: z.string(),
  size: z.number().int().nonnegative().nullable(),
  kind: z.enum(['directory', 'file', 'symlink', 'submodule']),
});

const treeSchema = z.object({
  objectFormat: z.enum(['sha1', 'sha256']),
  ref: z.object({
    name: z.string(),
    fullName: z.string(),
    oid: z.string().nullable(),
  }),
  path: z.string(),
  entries: z.array(treeEntrySchema),
});

const blobContentSchema = z.object({
  path: z.string(),
  ref: z.string(),
  oid: z.string(),
  size: z.number().int().nonnegative(),
  encoding: z.literal('utf-8'),
  content: z.string(),
});

const blobByShaSchema = blobContentSchema.omit({
  path: true,
  ref: true,
});

const commitIdentitySchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string(),
});

const commitSummarySchema = z.object({
  sha: z.string(),
  author: commitIdentitySchema,
  committer: commitIdentitySchema,
  message: z.string(),
  parents: z.array(z.string()),
});

const commitFileSchema = z.object({
  path: z.string(),
  previousPath: z.string().nullable(),
  status: z.enum([
    'added',
    'modified',
    'deleted',
    'renamed',
    'copied',
    'type-changed',
    'unmerged',
    'unknown',
  ]),
  additions: z.number().int().nullable(),
  deletions: z.number().int().nullable(),
  binary: z.boolean(),
});

const commitSchema = commitSummarySchema.extend({
  stats: z.object({
    additions: z.number().int(),
    deletions: z.number().int(),
    filesChanged: z.number().int(),
  }),
  files: z.array(commitFileSchema),
});

const unifiedDiffSchema = z.object({
  diff: z.string(),
  size: z.number().int(),
  truncated: z.boolean(),
  binary: z.boolean(),
});

const comparisonSchema = z.object({
  base: z.string(),
  head: z.string(),
  mergeBase: z.string().nullable(),
  aheadBy: z.number().int(),
  behindBy: z.number().int(),
  diff: unifiedDiffSchema,
});

const successResponse = (key: string, schema: z.ZodTypeAny) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      [key]: schema,
    }),
  });

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': { schema },
  },
});

const errorResponse = (description: string) => jsonResponse(description, repositoryErrorSchema);

const optionalBearerSecurity = [{}, { BearerAuth: [] }];
const bearerSecurity = [{ BearerAuth: [] }];

const commonReadErrors = {
  400: errorResponse('Invalid Git request or parameters.'),
  401: errorResponse('Authentication is required or invalid.'),
  403: errorResponse('You do not have permission to read this repository.'),
  404: errorResponse('Repository or Git object was not found.'),
  413: errorResponse('Requested Git content exceeds the allowed size.'),
  415: errorResponse('Binary content cannot be returned as text.'),
  500: errorResponse('Unexpected Git read error.'),
};

const commonWriteErrors = {
  400: errorResponse('Invalid Git branch request.'),
  401: errorResponse('Authentication is required or invalid.'),
  403: errorResponse('You do not have permission to modify this repository.'),
  404: errorResponse('Repository or branch was not found.'),
  409: errorResponse('Branch conflict or protected default branch.'),
  500: errorResponse('Unexpected Git write error.'),
};

const refQuerySchema = z.object({
  ref: z.string().min(1).max(255).optional(),
});

const contentQuerySchema = z.object({
  ref: z.string().min(1).max(255).optional(),
  path: z.string().max(4096).openapi({
    description: 'Path to a file inside the repository.',
    example: 'src/index.ts',
  }),
});

const treeQuerySchema = z.object({
  ref: z.string().min(1).max(255).optional(),
  path: z.string().max(4096).optional().default(''),
});

const commitsQuerySchema = z.object({
  ref: z.string().min(1).max(255).optional(),
  path: z.string().max(4096).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
});

const branchNameQuerySchema = z.object({
  name: z.string().min(1).max(255),
});

const createBranchBodySchema = z.object({
  name: z.string().min(1).max(255),
  from: z.string().min(1).max(255).optional(),
});

const renameBranchBodySchema = z.object({
  name: z.string().min(1).max(255),
  newName: z.string().min(1).max(255),
});

const diffLimitQuerySchema = z.object({
  maxBytes: z.coerce.number().int().min(1024).max(5242880).optional(),
  max_bytes: z.coerce.number().int().min(1024).max(5242880).optional(),
});

const compareCommitsQuerySchema = z.object({
  base: shaSchema,
  head: shaSchema,
  maxBytes: z.coerce.number().int().min(1024).max(5242880).optional(),
  max_bytes: z.coerce.number().int().min(1024).max(5242880).optional(),
});

const compareBranchesQuerySchema = z.object({
  base: z.string().min(1).max(255),
  head: z.string().min(1).max(255),
  maxBytes: z.coerce.number().int().min(1024).max(5242880).optional(),
  max_bytes: z.coerce.number().int().min(1024).max(5242880).optional(),
});

const shaParamsSchema = repositoryParamsSchema.extend({
  sha: shaSchema,
});

// GET refs
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/refs',
  tags: ['Git'],
  operationId: 'getRepositoryGitRefs',
  summary: 'Get Git references',
  description: 'Returns repository branches, tags, HEAD and object format.',
  security: optionalBearerSecurity,
  request: { params: repositoryParamsSchema },
  responses: {
    200: jsonResponse('Git references retrieved.', successResponse('refs', refsSchema)),
    ...commonReadErrors,
  },
});

// GET branches
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/branches',
  tags: ['Git'],
  operationId: 'getRepositoryGitBranches',
  summary: 'List Git branches',
  security: optionalBearerSecurity,
  request: { params: repositoryParamsSchema },
  responses: {
    200: jsonResponse(
      'Branches retrieved.',
      z.object({
        success: z.literal(true),
        data: z.object({
          branches: z.array(referenceSchema),
          defaultBranch: z.string(),
        }),
      }),
    ),
    ...commonReadErrors,
  },
});

// GET branch details
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/branches/details',
  tags: ['Git'],
  operationId: 'getRepositoryGitBranch',
  summary: 'Get branch details',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: branchNameQuerySchema,
  },
  responses: {
    200: jsonResponse('Branch details retrieved.', successResponse('branch', branchSchema)),
    ...commonReadErrors,
  },
});

// POST create branch
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/repositories/{username}/{name}/git/branches',
  tags: ['Git'],
  operationId: 'createRepositoryGitBranch',
  summary: 'Create a Git branch',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': { schema: createBranchBodySchema },
      },
    },
  },
  responses: {
    201: jsonResponse('Branch created.', successResponse('branch', branchSchema)),
    ...commonWriteErrors,
  },
});

// DELETE branch
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/repositories/{username}/{name}/git/branches',
  tags: ['Git'],
  operationId: 'deleteRepositoryGitBranch',
  summary: 'Delete a Git branch',
  description: 'The default branch cannot be deleted.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: branchNameQuerySchema,
  },
  responses: {
    204: { description: 'Branch deleted successfully. No response body.' },
    ...commonWriteErrors,
  },
});

// PATCH rename branch
openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/repositories/{username}/{name}/git/branches',
  tags: ['Git'],
  operationId: 'renameRepositoryGitBranch',
  summary: 'Rename a Git branch',
  description: 'The default branch cannot be renamed.',
  security: bearerSecurity,
  request: {
    params: repositoryParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': { schema: renameBranchBodySchema },
      },
    },
  },
  responses: {
    200: jsonResponse('Branch renamed.', successResponse('branch', referenceSchema)),
    ...commonWriteErrors,
  },
});

// GET tree
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/tree',
  tags: ['Git'],
  operationId: 'getRepositoryGitTree',
  summary: 'Get repository tree',
  description: 'Returns entries at the requested repository path and reference.',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: treeQuerySchema,
  },
  responses: {
    200: jsonResponse('Repository tree retrieved.', successResponse('tree', treeSchema)),
    ...commonReadErrors,
  },
});

// GET file content
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/contents',
  tags: ['Git'],
  operationId: 'getRepositoryGitContent',
  summary: 'Get text file content',
  description: 'Returns UTF-8 text content for a file at the selected reference.',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: contentQuerySchema,
  },
  responses: {
    200: jsonResponse('File content retrieved.', successResponse('content', blobContentSchema)),
    ...commonReadErrors,
  },
});

// GET raw file
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/raw',
  tags: ['Git'],
  operationId: 'getRepositoryGitRawContent',
  summary: 'Get raw file content',
  description:
    'Returns the file as binary data. Response headers include X-Git-Blob-Oid and X-Git-Ref.',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: contentQuerySchema,
  },
  responses: {
    200: {
      description: 'Raw file bytes.',
      headers: {
        'X-Git-Blob-Oid': { schema: { type: 'string' } },
        'X-Git-Ref': { schema: { type: 'string' } },
        'Content-Length': { schema: { type: 'integer' } },
      },
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
    },
    ...commonReadErrors,
  },
});

// GET README
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/readme',
  tags: ['Git'],
  operationId: 'getRepositoryGitReadme',
  summary: 'Get repository README',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: refQuerySchema,
  },
  responses: {
    200: jsonResponse('README retrieved.', successResponse('readme', blobContentSchema)),
    ...commonReadErrors,
    404: errorResponse('Repository or README was not found.'),
  },
});

// GET blob by SHA
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/blobs/{sha}',
  tags: ['Git'],
  operationId: 'getRepositoryGitBlob',
  summary: 'Get Git blob by SHA',
  security: optionalBearerSecurity,
  request: { params: shaParamsSchema },
  responses: {
    200: jsonResponse('Blob retrieved.', successResponse('blob', blobByShaSchema)),
    ...commonReadErrors,
  },
});

// GET commits
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/commits',
  tags: ['Git'],
  operationId: 'getRepositoryGitCommits',
  summary: 'List Git commits',
  description: 'Returns a paginated commit list. perPage and per_page are accepted aliases.',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: commitsQuerySchema,
  },
  responses: {
    200: jsonResponse(
      'Commits retrieved.',
      successResponse('commits', z.array(commitSummarySchema)),
    ),
    ...commonReadErrors,
  },
});

// GET commit
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/commits/{sha}',
  tags: ['Git'],
  operationId: 'getRepositoryGitCommit',
  summary: 'Get commit details',
  security: optionalBearerSecurity,
  request: { params: shaParamsSchema },
  responses: {
    200: jsonResponse('Commit retrieved.', successResponse('commit', commitSchema)),
    ...commonReadErrors,
  },
});

// GET commit diff
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/commits/{sha}/diff',
  tags: ['Git'],
  operationId: 'getRepositoryGitCommitDiff',
  summary: 'Get commit diff',
  description: 'Maximum diff size is 5 MiB. Default limit is 1 MiB.',
  security: optionalBearerSecurity,
  request: {
    params: shaParamsSchema,
    query: diffLimitQuerySchema,
  },
  responses: {
    200: jsonResponse('Commit diff retrieved.', successResponse('diff', unifiedDiffSchema)),
    ...commonReadErrors,
    413: errorResponse('Diff output exceeds the requested limit.'),
  },
});

// GET compare commits
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/compare/commits',
  tags: ['Git'],
  operationId: 'compareRepositoryGitCommits',
  summary: 'Compare two commits',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: compareCommitsQuerySchema,
  },
  responses: {
    200: jsonResponse(
      'Commit comparison retrieved.',
      successResponse('comparison', comparisonSchema),
    ),
    ...commonReadErrors,
    413: errorResponse('Diff output exceeds the requested limit.'),
  },
});

// GET compare branches
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/repositories/{username}/{name}/git/compare/branches',
  tags: ['Git'],
  operationId: 'compareRepositoryGitBranches',
  summary: 'Compare two branches',
  security: optionalBearerSecurity,
  request: {
    params: repositoryParamsSchema,
    query: compareBranchesQuerySchema,
  },
  responses: {
    200: jsonResponse(
      'Branch comparison retrieved.',
      successResponse('comparison', comparisonSchema),
    ),
    ...commonReadErrors,
    413: errorResponse('Diff output exceeds the requested limit.'),
  },
});
