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
  getGitBlobContent,
  getGitBlobContentBySha,
} from '../../../src/services/git/git-content.service.js';
import {
  getGitRepositoryRefs,
  type GitRepositoryRefs,
} from '../../../src/services/git/git-ref.service.js';
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
  '../../../src/services/git/git-content.service.js',
  () => ({
    getGitBlobContent:
      vi.fn(),
    getGitBlobContentBySha:
      vi.fn(),
  }),
);

vi.mock(
  '../../../src/services/git/git-ref.service.js',
  () => ({
    getGitRepositoryRefs:
      vi.fn(),
  }),
);

const mockedAuthorize =
  vi.mocked(
    authorizeRepositoryContentRead,
  );

const mockedGetRefs =
  vi.mocked(
    getGitRepositoryRefs,
  );

const mockedGetBlobContent =
  vi.mocked(
    getGitBlobContent,
  );

const mockedGetBlobContentBySha =
  vi.mocked(
    getGitBlobContentBySha,
  );

const accessResult = {
  repositoryId: 'repo-1',
  repositoryName: 'demo',
  repositoryOwnerId: 'owner-1',
  repositoryOwnerUsername: 'asil',
  isPrivate: false,
  permission: 'PUBLIC',
} as const;

const refsResult: GitRepositoryRefs = {
  objectFormat: 'sha1',
  symbolicHead:
    'refs/heads/main',
  defaultBranch: 'main',

  head: {
    name: 'main',
    fullName:
      'refs/heads/main',
    oid:
      '1111111111111111111111111111111111111111',
    objectType:
      'commit',
  },

  branches: [
    {
      name: 'main',
      fullName:
        'refs/heads/main',
      oid:
        '1111111111111111111111111111111111111111',
      objectType:
        'commit',
    },
  ],

  tags: [],
};

describe(
  'repository content API',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedAuthorize
        .mockResolvedValue(
          accessResult,
        );

      mockedGetRefs
        .mockResolvedValue(
          refsResult,
        );
    });

    it('returns refs for anonymous public access', async () => {
      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/refs',
          );

      expect(response.status)
        .toBe(200);

      expect(response.body)
        .toMatchObject({
          success: true,

          data: {
            refs: {
              defaultBranch:
                'main',

              symbolicHead:
                'refs/heads/main',
            },
          },
        });

      expect(mockedAuthorize)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          undefined,
        );

      expect(mockedGetRefs)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
        );
    });

    it('passes authenticated user to content authorization', async () => {
      await request(app)
        .get(
          '/api/repositories/asil/demo/git/refs',
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

    it('returns file content by repository path', async () => {
      mockedGetBlobContent
        .mockResolvedValue({
          path: 'README.md',
          ref: 'main',
          oid:
            '2222222222222222222222222222222222222222',
          size: 24,
          encoding: 'utf-8',
          content:
            'GitZone Phase 4 E2E test',
        });

      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/contents',
          )
          .query({
            ref: 'main',
            path: 'README.md',
          });

      expect(response.status)
        .toBe(200);

      expect(response.body)
        .toMatchObject({
          success: true,
          data: {
            content: {
              path: 'README.md',
              ref: 'main',
              size: 24,
              encoding: 'utf-8',
              content:
                'GitZone Phase 4 E2E test',
            },
          },
        });

      expect(mockedAuthorize)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          undefined,
        );

      expect(mockedGetBlobContent)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          'main',
          'README.md',
        );
    });

    it('returns blob content by SHA', async () => {
      const sha =
        '3333333333333333333333333333333333333333';

      mockedGetBlobContentBySha
        .mockResolvedValue({
          oid: sha,
          size: 24,
          encoding: 'utf-8',
          content:
            'GitZone Phase 4 E2E test',
        });

      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/blobs/' + sha,
          );

      expect(response.status)
        .toBe(200);

      expect(response.body)
        .toMatchObject({
          success: true,
          data: {
            blob: {
              oid: sha,
              size: 24,
              encoding: 'utf-8',
              content:
                'GitZone Phase 4 E2E test',
            },
          },
        });

      expect(mockedGetBlobContentBySha)
        .toHaveBeenCalledWith(
          'asil',
          'demo',
          sha,
        );
    });

    it('returns 413 when repository file exceeds readable size limit', async () => {
      mockedGetBlobContent
        .mockRejectedValue(
          new AppError(
            'Git file exceeds the maximum readable size',
            413,
            'GIT_FILE_TOO_LARGE',
          ),
        );

      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/contents',
          )
          .query({
            ref: 'main',
            path: 'huge.txt',
          });

      expect(response.status)
        .toBe(413);

      expect(response.body)
        .toMatchObject({
          success: false,
          error: {
            code:
              'GIT_FILE_TOO_LARGE',
            message:
              'Git file exceeds the maximum readable size',
          },
        });
    });

    it('returns 413 when Git blob exceeds readable size limit', async () => {
      const sha =
        '4444444444444444444444444444444444444444';

      mockedGetBlobContentBySha
        .mockRejectedValue(
          new AppError(
            'Git file exceeds the maximum readable size',
            413,
            'GIT_FILE_TOO_LARGE',
          ),
        );

      const response =
        await request(app)
          .get(
            '/api/repositories/asil/demo/git/blobs/' + sha,
          );

      expect(response.status)
        .toBe(413);

      expect(response.body)
        .toMatchObject({
          success: false,
          error: {
            code:
              'GIT_FILE_TOO_LARGE',
            message:
              'Git file exceeds the maximum readable size',
          },
        });
    });
    it('returns safe authorization errors', async () => {
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
            '/api/repositories/asil/private/git/refs',
          );

      expect(response.status)
        .toBe(404);

      expect(response.body)
        .toMatchObject({
          success: false,

          error: {
            code:
              'REPOSITORY_NOT_FOUND',

            message:
              'Repository not found',
          },
        });

      expect(mockedGetRefs)
        .not.toHaveBeenCalled();
    });
  },
);
