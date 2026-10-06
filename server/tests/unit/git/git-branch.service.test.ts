import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGetGitRepositoryRefs } = vi.hoisted(() => ({
  mockedGetGitRepositoryRefs: vi.fn(),
}));

vi.mock('../../../src/services/git/git-ref.service.js', () => ({
  getGitRepositoryRefs: mockedGetGitRepositoryRefs,
}));

const { getGitBranch } = await import('../../../src/services/git/git-branch.service.js');

const MAIN_OID = '1111111111111111111111111111111111111111';

const DEVELOP_OID = '2222222222222222222222222222222222222222';

const refs = {
  objectFormat: 'sha1' as const,
  symbolicHead: 'refs/heads/main',
  defaultBranch: 'main',

  head: {
    name: 'main',
    fullName: 'refs/heads/main',
    oid: MAIN_OID,
    objectType: 'commit' as const,
  },

  branches: [
    {
      name: 'main',
      fullName: 'refs/heads/main',
      oid: MAIN_OID,
      objectType: 'commit' as const,
    },
    {
      name: 'develop',
      fullName: 'refs/heads/develop',
      oid: DEVELOP_OID,
      objectType: 'commit' as const,
    },
  ],

  tags: [],
};

describe('Git branch service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetGitRepositoryRefs.mockResolvedValue(refs);
  });

  it('returns branch details', async () => {
    const result = await getGitBranch('asil', 'demo', 'develop');

    expect(result).toEqual({
      name: 'develop',
      fullName: 'refs/heads/develop',
      oid: DEVELOP_OID,
      objectType: 'commit',
      isDefault: false,
    });

    expect(mockedGetGitRepositoryRefs).toHaveBeenCalledWith('asil', 'demo');
  });

  it('marks the default branch', async () => {
    const result = await getGitBranch('asil', 'demo', 'main');

    expect(result.isDefault).toBe(true);
  });

  it('returns 404 for a missing branch', async () => {
    await expect(getGitBranch('asil', 'demo', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'GIT_BRANCH_NOT_FOUND',
    });
  });

  it('rejects an invalid branch name before reading Git refs', async () => {
    await expect(getGitBranch('asil', 'demo', '../main')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_BRANCH_NAME',
    });

    expect(mockedGetGitRepositoryRefs).not.toHaveBeenCalled();
  });

  it('does not treat a tag as a branch', async () => {
    mockedGetGitRepositoryRefs.mockResolvedValue({
      ...refs,
      branches: [refs.branches[0]],
      tags: [
        {
          name: 'v1.0.0',
          fullName: 'refs/tags/v1.0.0',
          oid: DEVELOP_OID,
          objectType: 'tag',
        },
      ],
    });

    await expect(getGitBranch('asil', 'demo', 'v1.0.0')).rejects.toMatchObject({
      statusCode: 404,
      code: 'GIT_BRANCH_NOT_FOUND',
    });
  });
});
