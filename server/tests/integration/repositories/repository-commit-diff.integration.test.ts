import type { NextFunction, Request, Response } from 'express';

import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';
import { getGitCommit, listGitCommits } from '../../../src/services/git/git-commit.service.js';
import {
  compareGitBranches,
  compareGitCommits,
  getGitCommitDiff,
} from '../../../src/services/git/git-diff.service.js';
import { authorizeRepositoryContentRead } from '../../../src/services/repositories/repository-content-access.service.js';

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/middleware/optional-auth.middleware.js', () => ({
  optionalAuthMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      (req as Request & { userId?: string }).userId = 'viewer-1';
    }

    next();
  },
}));

vi.mock('../../../src/services/repositories/repository-content-access.service.js', () => ({
  authorizeRepositoryContentRead: vi.fn(),
}));

vi.mock('../../../src/services/git/git-commit.service.js', () => ({
  listGitCommits: vi.fn(),
  getGitCommit: vi.fn(),
}));

vi.mock('../../../src/services/git/git-diff.service.js', () => ({
  getGitCommitDiff: vi.fn(),
  compareGitCommits: vi.fn(),
  compareGitBranches: vi.fn(),
}));

const mockedAuthorize = vi.mocked(authorizeRepositoryContentRead);
const mockedListCommits = vi.mocked(listGitCommits);
const mockedGetCommit = vi.mocked(getGitCommit);
const mockedGetCommitDiff = vi.mocked(getGitCommitDiff);
const mockedCompareCommits = vi.mocked(compareGitCommits);
const mockedCompareBranches = vi.mocked(compareGitBranches);

const sha1 = '1111111111111111111111111111111111111111';
const sha2 = '2222222222222222222222222222222222222222';
const sha3 = '3333333333333333333333333333333333333333';

const accessResult = {
  repositoryId: 'repo-1',
  repositoryName: 'demo',
  repositoryOwnerId: 'owner-1',
  repositoryOwnerUsername: 'asil',
  isPrivate: false,
  permission: 'PUBLIC',
} as const;

const commitSummary = {
  sha: sha3,
  parents: [sha2],
  author: {
    name: 'Phase 6 Author',
    email: 'author@gitzone.local',
    date: '2026-10-07T10:00:00+05:00',
  },
  committer: {
    name: 'Phase 6 Committer',
    email: 'committer@gitzone.local',
    date: '2026-10-07T10:01:00+05:00',
  },
  message: 'feat: Phase 6 commit',
};

const commitDetail = {
  ...commitSummary,
  stats: {
    additions: 5,
    deletions: 1,
    filesChanged: 2,
  },
  files: [
    {
      path: 'math.ts',
      previousPath: null,
      status: 'modified' as const,
      additions: 4,
      deletions: 1,
      binary: false,
    },
    {
      path: 'binary.dat',
      previousPath: null,
      status: 'added' as const,
      additions: 0,
      deletions: 0,
      binary: true,
    },
  ],
};

const unifiedDiffResult = {
  diff: 'diff --git a/math.ts b/math.ts',
  size: 128,
  truncated: false,
  binary: false,
};

const compareResult = {
  base: sha2,
  head: sha3,
  mergeBase: sha2,
  aheadBy: 1,
  behindBy: 0,
  diff: unifiedDiffResult,
};

describe('repository commit, diff and compare API', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedAuthorize.mockResolvedValue(accessResult);
    mockedListCommits.mockResolvedValue([commitSummary]);
    mockedGetCommit.mockResolvedValue(commitDetail);
    mockedGetCommitDiff.mockResolvedValue(unifiedDiffResult);
    mockedCompareCommits.mockResolvedValue(compareResult);
    mockedCompareBranches.mockResolvedValue(compareResult);
  });

  it('returns commit history with pagination parameters', async () => {
    const response = await request(app)
      .get('/api/repositories/asil/demo/git/commits')
      .query({ ref: 'main', page: 2, perPage: 10 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.commits).toEqual([commitSummary]);

    expect(mockedListCommits).toHaveBeenCalledWith('asil', 'demo', 'main', undefined, 2, 10);
  });

  it('returns commit details including parents, statistics and files', async () => {
    const response = await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3)
      .expect(200);

    expect(response.body.data.commit).toEqual(commitDetail);
    expect(response.body.data.commit.parents).toEqual([sha2]);
    expect(response.body.data.commit.stats.filesChanged).toBe(2);
    expect(response.body.data.commit.files[1].binary).toBe(true);

    expect(mockedGetCommit).toHaveBeenCalledWith('asil', 'demo', sha3);
  });

  it('returns unified commit diff', async () => {
    const response = await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3 + '/diff')
      .query({ maxBytes: 2048 })
      .expect(200);

    expect(response.body.data.diff).toEqual(unifiedDiffResult);
    expect(response.body.data.diff.diff).toContain('diff --git');

    expect(mockedGetCommitDiff).toHaveBeenCalledWith('asil', 'demo', sha3, 2048);
  });

  it('supports max_bytes alias', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3 + '/diff')
      .query({ max_bytes: 4096 })
      .expect(200);

    expect(mockedGetCommitDiff).toHaveBeenCalledWith('asil', 'demo', sha3, 4096);
  });

  it('compares two commits', async () => {
    const response = await request(app)
      .get('/api/repositories/asil/demo/git/compare/commits')
      .query({
        base: sha1,
        head: sha3,
        maxBytes: 4096,
      })
      .expect(200);

    expect(response.body.data.comparison).toEqual(compareResult);

    expect(mockedCompareCommits).toHaveBeenCalledWith('asil', 'demo', sha1, sha3, 4096);
  });

  it('compares branches including slash branch names', async () => {
    const response = await request(app)
      .get('/api/repositories/asil/demo/git/compare/branches')
      .query({
        base: 'main',
        head: 'feature/compare',
      })
      .expect(200);

    expect(response.body.data.comparison).toEqual(compareResult);

    expect(mockedCompareBranches).toHaveBeenCalledWith(
      'asil',
      'demo',
      'main',
      'feature/compare',
      1024 * 1024,
    );
  });

  it('rejects an invalid commit SHA before authorization', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/compare/commits')
      .query({
        base: 'not-a-sha',
        head: sha3,
      })
      .expect(400);

    expect(mockedAuthorize).not.toHaveBeenCalled();
    expect(mockedCompareCommits).not.toHaveBeenCalled();
  });

  it('rejects an unsafe branch ref before authorization', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/compare/branches')
      .query({
        base: 'main',
        head: '../secret',
      })
      .expect(400);

    expect(mockedAuthorize).not.toHaveBeenCalled();
    expect(mockedCompareBranches).not.toHaveBeenCalled();
  });

  it('rejects diff limits below 1 KiB', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3 + '/diff')
      .query({ maxBytes: 100 })
      .expect(400);

    expect(mockedAuthorize).not.toHaveBeenCalled();
    expect(mockedGetCommitDiff).not.toHaveBeenCalled();
  });

  it('rejects diff limits above 5 MiB', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3 + '/diff')
      .query({ maxBytes: 5 * 1024 * 1024 + 1 })
      .expect(400);

    expect(mockedAuthorize).not.toHaveBeenCalled();
    expect(mockedGetCommitDiff).not.toHaveBeenCalled();
  });

  it('passes authenticated user to repository authorization', async () => {
    await request(app)
      .get('/api/repositories/asil/demo/git/commits/' + sha3 + '/diff')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(mockedAuthorize).toHaveBeenCalledWith('asil', 'demo', 'viewer-1');
  });

  it('hides a private repository from an anonymous caller', async () => {
    mockedAuthorize.mockRejectedValue(
      new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND'),
    );

    const response = await request(app)
      .get('/api/repositories/asil/private-repo/git/compare/branches')
      .query({ base: 'main', head: 'develop' })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'REPOSITORY_NOT_FOUND',
      },
    });

    expect(mockedCompareBranches).not.toHaveBeenCalled();
  });

  it('allows an authenticated private repository owner', async () => {
    mockedAuthorize.mockResolvedValue({
      ...accessResult,
      isPrivate: true,
      permission: 'OWNER',
    });

    await request(app)
      .get('/api/repositories/asil/private-repo/git/compare/branches')
      .set('Authorization', 'Bearer owner-token')
      .query({ base: 'main', head: 'feature/compare' })
      .expect(200);

    expect(mockedAuthorize).toHaveBeenCalledWith('asil', 'private-repo', 'viewer-1');

    expect(mockedCompareBranches).toHaveBeenCalled();
  });
});
