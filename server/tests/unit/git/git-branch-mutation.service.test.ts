import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitReadError } from '../../../src/errors/git-read.error.js';
import { GitWriteError } from '../../../src/errors/git-write.error.js';
import { executeGitReadCommand } from '../../../src/services/git/git-read-command.service.js';
import { getGitRepositoryRefs } from '../../../src/services/git/git-ref.service.js';
import { executeGitWriteCommand } from '../../../src/services/git/git-write-command.service.js';

vi.mock('../../../src/services/git/git-read-command.service.js', () => ({
  executeGitReadCommand: vi.fn(),
}));

vi.mock('../../../src/services/git/git-ref.service.js', () => ({
  getGitRepositoryRefs: vi.fn(),
}));

vi.mock('../../../src/services/git/git-write-command.service.js', () => ({
  executeGitWriteCommand: vi.fn(),
}));

const mockedRead = vi.mocked(executeGitReadCommand);

const mockedRefs = vi.mocked(getGitRepositoryRefs);

const mockedWrite = vi.mocked(executeGitWriteCommand);

const MAIN_OID = '1111111111111111111111111111111111111111';

const DEVELOP_OID = '2222222222222222222222222222222222222222';

const SHA256_OID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const ZERO_SHA1 = '0000000000000000000000000000000000000000';

const ZERO_SHA256 = '0000000000000000000000000000000000000000000000000000000000000000';

const sha1Refs = {
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

const { createGitBranch } =
  await import('../../../src/services/git/git-branch-mutation.service.js');

describe('Git branch mutation service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedRead.mockResolvedValue({
      stdout: '',
      stderr: '',
    });

    mockedRefs.mockResolvedValue(sha1Refs);

    mockedWrite.mockResolvedValue({
      stdout: '',
      stderr: '',
    });
  });

  it('creates a branch from the default branch', async () => {
    const branch = await createGitBranch({
      username: 'asil',
      repositoryName: 'demo',
      branchName: 'feature/login',
    });

    expect(branch).toEqual({
      name: 'feature/login',
      fullName: 'refs/heads/feature/login',
      oid: MAIN_OID,
      objectType: 'commit',
      isDefault: false,
    });

    expect(mockedRead).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['check-ref-format', '--branch', 'feature/login'],
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['update-ref', 'refs/heads/feature/login', MAIN_OID, ZERO_SHA1],
    });
  });

  it('creates a branch from an explicit source branch', async () => {
    const branch = await createGitBranch({
      username: 'asil',
      repositoryName: 'demo',
      branchName: 'feature/api',
      from: 'develop',
    });

    expect(branch.oid).toBe(DEVELOP_OID);

    expect(mockedRead).toHaveBeenCalledTimes(2);

    expect(mockedRead).toHaveBeenNthCalledWith(2, {
      username: 'asil',
      repositoryName: 'demo',
      args: ['check-ref-format', '--branch', 'develop'],
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['update-ref', 'refs/heads/feature/api', DEVELOP_OID, ZERO_SHA1],
    });
  });

  it('rejects a locally unsafe branch name before Git execution', async () => {
    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: '../main',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_BRANCH_NAME',
    });

    expect(mockedRead).not.toHaveBeenCalled();

    expect(mockedRefs).not.toHaveBeenCalled();

    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('rejects a branch name rejected by Git check-ref-format', async () => {
    mockedRead.mockRejectedValueOnce(
      new GitReadError('Git read command failed', 'GIT_READ_COMMAND_FAILED', {
        exitCode: 128,
      }),
    );

    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'invalid.',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_BRANCH_NAME',
    });

    expect(mockedRefs).not.toHaveBeenCalled();

    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('rejects an invalid explicit source ref', async () => {
    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'feature/api',
        from: '../main',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_BRANCH_NAME',
    });

    expect(mockedRefs).not.toHaveBeenCalled();

    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('rejects an existing branch', async () => {
    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'develop',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'GIT_BRANCH_ALREADY_EXISTS',
    });

    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('rejects a missing source branch', async () => {
    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'feature/api',
        from: 'missing',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'GIT_SOURCE_BRANCH_NOT_FOUND',
    });

    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('uses SHA-256 zero OID for SHA-256 repositories', async () => {
    mockedRefs.mockResolvedValue({
      objectFormat: 'sha256',
      symbolicHead: 'refs/heads/main',
      defaultBranch: 'main',

      head: {
        name: 'main',
        fullName: 'refs/heads/main',
        oid: SHA256_OID,
        objectType: 'commit',
      },

      branches: [
        {
          name: 'main',
          fullName: 'refs/heads/main',
          oid: SHA256_OID,
          objectType: 'commit',
        },
      ],

      tags: [],
    });

    await createGitBranch({
      username: 'asil',
      repositoryName: 'demo',
      branchName: 'feature/sha256',
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['update-ref', 'refs/heads/feature/sha256', SHA256_OID, ZERO_SHA256],
    });
  });

  it('maps concurrent update-ref failure to a branch conflict', async () => {
    mockedWrite.mockRejectedValue(
      new GitWriteError('Git write command failed', 'GIT_WRITE_COMMAND_FAILED', {
        exitCode: 128,
        stderr: 'fatal: cannot lock ref',
      }),
    );

    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'feature/race',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'GIT_BRANCH_CONFLICT',
    });
  });

  it('preserves non-command Git infrastructure failures', async () => {
    mockedWrite.mockRejectedValue(
      new GitWriteError('Git write command timed out', 'GIT_WRITE_TIMEOUT'),
    );

    await expect(
      createGitBranch({
        username: 'asil',
        repositoryName: 'demo',
        branchName: 'feature/api',
      }),
    ).rejects.toMatchObject({
      code: 'GIT_WRITE_TIMEOUT',
    });
  });
});
