import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getGitRepositoryRefs } from '../../../src/services/git/git-ref.service.js';
import { getPullRequestDiff } from '../../../src/services/pull-requests/pull-request-git.service.js';

vi.mock('../../../src/services/git/git-ref.service.js', () => ({
  getGitRepositoryRefs: vi.fn(),
}));

vi.mock('../../../src/services/pull-requests/pull-request-git.service.js', () => ({
  getPullRequestDiff: vi.fn(),
}));

const mockedRefs = vi.mocked(getGitRepositoryRefs);
const mockedDiff = vi.mocked(getPullRequestDiff);

const BASE_SHA = '1111111111111111111111111111111111111111';
const HEAD_SHA = '2222222222222222222222222222222222222222';
const NEW_HEAD_SHA = '3333333333333333333333333333333333333333';

const refs = {
  objectFormat: 'sha1' as const,
  symbolicHead: 'refs/heads/main',
  defaultBranch: 'main',
  head: {
    name: 'main',
    fullName: 'refs/heads/main',
    oid: BASE_SHA,
    objectType: 'commit' as const,
  },
  branches: [
    {
      name: 'main',
      fullName: 'refs/heads/main',
      oid: BASE_SHA,
      objectType: 'commit' as const,
    },
    {
      name: 'feature',
      fullName: 'refs/heads/feature',
      oid: HEAD_SHA,
      objectType: 'commit' as const,
    },
  ],
  tags: [],
};

const comparison = {
  base: BASE_SHA,
  head: HEAD_SHA,
  mergeBase: BASE_SHA,
  aheadBy: 1,
  behindBy: 0,
  diff: {
    diff: [
      'diff --git a/src/demo.ts b/src/demo.ts',
      'index 1111111..2222222 100644',
      '--- a/src/demo.ts',
      '+++ b/src/demo.ts',
      '@@ -1,3 +1,4 @@',
      ' const first = 1;',
      '-const oldValue = 2;',
      '+const newValue = 2;',
      '+const added = 3;',
      ' const last = 4;',
      '',
    ].join('\n'),
    size: 256,
    truncated: false,
    binary: false,
  },
};

const { isPullRequestDiffAnchorOutdated, validatePullRequestDiffAnchor } =
  await import('../../../src/services/pull-requests/pull-request-review-git.service.js');

describe('pull request review Git service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRefs.mockResolvedValue(refs);
    mockedDiff.mockResolvedValue(comparison);
  });

  it('validates a RIGHT-side added diff line', async () => {
    const anchor = await validatePullRequestDiffAnchor(
      'asil',
      'demo',
      'feature',
      'main',
      'src/demo.ts',
      2,
      'RIGHT',
    );

    expect(anchor).toEqual({
      path: 'src/demo.ts',
      line: 2,
      side: 'RIGHT',
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
    });

    expect(mockedDiff).toHaveBeenCalledWith('asil', 'demo', 'feature', 'main');
  });

  it('validates a LEFT-side removed diff line', async () => {
    const anchor = await validatePullRequestDiffAnchor(
      'asil',
      'demo',
      'feature',
      'main',
      'src/demo.ts',
      2,
      'LEFT',
    );

    expect(anchor.side).toBe('LEFT');
    expect(anchor.line).toBe(2);
  });

  it('rejects a position outside the PR diff', async () => {
    await expect(
      validatePullRequestDiffAnchor('asil', 'demo', 'feature', 'main', 'src/demo.ts', 999, 'RIGHT'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_PULL_REQUEST_DIFF_POSITION',
    });
  });

  it('rejects binary diff comments', async () => {
    mockedDiff.mockResolvedValueOnce({
      ...comparison,
      diff: {
        ...comparison.diff,
        binary: true,
      },
    });

    await expect(
      validatePullRequestDiffAnchor('asil', 'demo', 'feature', 'main', 'src/demo.ts', 2, 'RIGHT'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PULL_REQUEST_BINARY_DIFF_COMMENT_NOT_SUPPORTED',
    });
  });

  it('rejects truncated diff comments', async () => {
    mockedDiff.mockResolvedValueOnce({
      ...comparison,
      diff: {
        ...comparison.diff,
        truncated: true,
      },
    });

    await expect(
      validatePullRequestDiffAnchor('asil', 'demo', 'feature', 'main', 'src/demo.ts', 2, 'RIGHT'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PULL_REQUEST_DIFF_TRUNCATED',
    });
  });

  it('marks an unchanged snapshot as current', async () => {
    await expect(
      isPullRequestDiffAnchorOutdated('asil', 'demo', 'feature', 'main', {
        baseSha: BASE_SHA,
        headSha: HEAD_SHA,
      }),
    ).resolves.toBe(false);
  });

  it('marks an old source snapshot as outdated', async () => {
    mockedRefs.mockResolvedValueOnce({
      ...refs,
      branches: refs.branches.map((branch) =>
        branch.name === 'feature'
          ? {
              ...branch,
              oid: NEW_HEAD_SHA,
            }
          : branch,
      ),
    });

    await expect(
      isPullRequestDiffAnchorOutdated('asil', 'demo', 'feature', 'main', {
        baseSha: BASE_SHA,
        headSha: HEAD_SHA,
      }),
    ).resolves.toBe(true);
  });

  it('rejects a missing source branch', async () => {
    mockedRefs.mockResolvedValueOnce({
      ...refs,
      branches: refs.branches.filter((branch) => branch.name !== 'feature'),
    });

    await expect(
      validatePullRequestDiffAnchor('asil', 'demo', 'feature', 'main', 'src/demo.ts', 2, 'RIGHT'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PULL_REQUEST_SOURCE_BRANCH_NOT_FOUND',
    });
  });
});
