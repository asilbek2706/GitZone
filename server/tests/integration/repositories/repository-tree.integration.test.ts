import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';
import {
  getGitRepositoryTree,
  type GitRepositoryTree,
} from '../../../src/services/git/git-tree.service.js';
import {
  authorizeRepositoryContentRead,
} from '../../../src/services/repositories/repository-content-access.service.js';

vi.mock(
  '../../../src/controllers/git/git-http.controller.js',
  () => ({
    gitHttpController:
      vi.fn(),
  }),
);

vi.mock(
  '../../../src/middleware/optional-auth.middleware.js',
  () => ({
    optionalAuthMiddleware: (
      req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      if (
        req.headers.authorization
      ) {
        (
          req as Request & {
            userId?: string;
          }
        ).userId =
          'viewer-1';
      }

      next();
    },
  }),
);

vi.mock(
  '../../../src/services/repositories/repository-content-access.service.js',
  () => ({
    authorizeRepositoryContentRead:
      vi.fn(),
  }),
);

vi.mock(
  '../../../src/services/git/git-tree.service.js',
  () => ({
    getGitRepositoryTree:
      vi.fn(),
  }),
);

const mockedAuthorize =
  vi.mocked(
    authorizeRepositoryContentRead,
  );

const mockedGetTree =
  vi.mocked(
    getGitRepositoryTree,
  );

const accessResult = {
  repositoryId: 'repo-1',
  repositoryName: 'demo',
  repositoryOwnerId: 'owner-1',
  repositoryOwnerUsername: 'asil',
  isPrivate: false,
  permission: 'PUBLIC',
} as const;

const treeResult: GitRepositoryTree = {
  objectFormat: 'sha1',

  ref: {
    name: 'main',
    fullName:
      'refs/heads/main',
    oid:
      '1111111111111111111111111111111111111111',
  },

  path: 'src',

  entries: [
    {
      name: 'index.ts',
      path:
        'src/index.ts',
      mode: '100644',
      objectType:
        'blob',
      oid:
        '2222222222222222222222222222222222222222',
      size: 42,
      kind: 'file',
    },
  ],
};

describe(
  'repository tree API',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedAuthorize
        .mockResolvedValue(
          accessResult,
        );

      mockedGetTree
        .mockResolvedValue(
          treeResult,
        );
    });

    it('returns repository tree for public access', async () => {
      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/tree',
          )
          .query({
            ref: 'main',
            path: 'src',
          });

      expect(response.status)
        .toBe(200);

      expect(response.body)
        .toMatchObject({
          success: true,

          data: {
            tree: {
              path: 'src',

              ref: {
                name: 'main',
              },

              entries: [
                {
                  name:
                    'index.ts',

                  kind:
                    'file',
                },
              ],
            },
          },
        });

      expect(mockedAuthorize)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          undefined,
        );

      expect(mockedGetTree)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          'main',
          'src',
        );
    });

    it('passes authenticated user to content authorization', async () => {
      await request(app)
        .get(
          '/api/repositories/asil/demo/git/tree',
        )
        .set(
          'Authorization',
          'Bearer test-token',
        );

      expect(mockedAuthorize)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          'viewer-1',
        );
    });

    it('rejects invalid tree query', async () => {
      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/tree',
          )
          .query({
            path:
              '../secret',
          });

      expect(response.status)
        .toBe(400);

      expect(response.body)
        .toMatchObject({
          success: false,

          error: {
            code:
              'INVALID_REPOSITORY_TREE_QUERY',
          },
        });

      expect(mockedAuthorize)
        .not.toHaveBeenCalled();

      expect(mockedGetTree)
        .not.toHaveBeenCalled();
    });

    it('does not expose inaccessible repository content', async () => {
      mockedAuthorize
        .mockRejectedValue(
          new AppError(
            'Repository not found',
            404,
            'REPOSITORY_NOT_FOUND',
          ),
        );

      const response =
        await request(app)
          .get(
            '/api/repositories/asil/private/git/tree',
          );

      expect(response.status)
        .toBe(404);

      expect(response.body)
        .toMatchObject({
          success: false,

          error: {
            code:
              'REPOSITORY_NOT_FOUND',
          },
        });

      expect(mockedGetTree)
        .not.toHaveBeenCalled();
    });
  },
);
