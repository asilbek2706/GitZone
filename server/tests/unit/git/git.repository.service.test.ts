import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedExecFile,
  mockedAccess,
  mockedRename,
  mockedRm,
} = vi.hoisted(() => ({
  mockedExecFile: vi.fn(),
  mockedAccess: vi.fn(),
  mockedRename: vi.fn(),
  mockedRm: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: mockedExecFile,
}));

vi.mock('node:fs/promises', () => ({
  default: {
    access: mockedAccess,
    rename: mockedRename,
    rm: mockedRm,
  },
}));

process.env.GIT_STORAGE_PATH = './storage/test-repositories';

const {
  createGitRepository,
  deleteGitRepository,
  finalizeStagedGitRepositoryDeletion,
  renameGitRepository,
  restoreStagedGitRepositoryDeletion,
  stageGitRepositoryDeletion,
} = await import(
  '../../../src/services/git/git-repository.service.js'
);

const missingFilesystemEntry = (): Error & {
  code: string;
} =>
  Object.assign(
    new Error('missing filesystem entry'),
    {
      code: 'ENOENT',
    },
  );

describe('git repository service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedAccess.mockRejectedValue(
      missingFilesystemEntry(),
    );

    mockedRm.mockResolvedValue(undefined);
  });

  it('creates a bare git repository', async () => {
    mockedExecFile.mockImplementation(
      (
        _file: unknown,
        _args: unknown,
        callback: unknown,
      ) => {
        if (typeof callback === 'function') {
          (
            callback as (
              error: Error | null,
              stdout: string,
              stderr: string,
            ) => void
          )(null, '', '');
        }

        return {};
      },
    );

    const result = await createGitRepository(
      'asil',
      'demo',
    );

    expect(mockedAccess).toHaveBeenCalledOnce();

    expect(mockedExecFile).toHaveBeenCalledTimes(2);

    expect(mockedExecFile).toHaveBeenNthCalledWith(
      1,
      'git',
      expect.arrayContaining([
        'init',
        '--bare',
        '--initial-branch=main',
        expect.stringContaining('asil/demo.git'),
      ]),
      expect.any(Function),
    );

    expect(mockedExecFile).toHaveBeenNthCalledWith(
      2,
      'git',
      expect.arrayContaining([
        '--git-dir',
        expect.stringContaining('asil/demo.git'),
        'config',
        'http.receivepack',
        'true',
      ]),
      expect.any(Function),
    );

    expect(result).toContain('asil/demo.git');
  });

  it('rejects creation when git repository path already exists', async () => {
    mockedAccess.mockResolvedValue(undefined);

    await expect(
      createGitRepository('asil', 'demo'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'GIT_REPOSITORY_ALREADY_EXISTS',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
    expect(mockedRm).not.toHaveBeenCalled();
  });

  it('throws when repository path inspection fails', async () => {
    mockedAccess.mockRejectedValue(
      Object.assign(
        new Error('permission denied'),
        {
          code: 'EACCES',
        },
      ),
    );

    await expect(
      createGitRepository('asil', 'demo'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_INSPECTION_FAILED',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('cleans up partial repository when git creation fails', async () => {
    mockedExecFile.mockImplementation(
      (
        _file: unknown,
        _args: unknown,
        callback: unknown,
      ) => {
        if (typeof callback === 'function') {
          (
            callback as (
              error: Error | null,
              stdout: string,
              stderr: string,
            ) => void
          )(
            new Error('git failed'),
            '',
            '',
          );
        }

        return {};
      },
    );

    await expect(
      createGitRepository('asil', 'demo'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_CREATE_FAILED',
    });

    expect(mockedRm).toHaveBeenCalledWith(
      expect.stringContaining('asil/demo.git'),
      {
        recursive: true,
        force: true,
      },
    );
  });

  it('reports critical cleanup failure after git creation failure', async () => {
    mockedExecFile.mockImplementation(
      (
        _file: unknown,
        _args: unknown,
        callback: unknown,
      ) => {
        if (typeof callback === 'function') {
          (
            callback as (
              error: Error | null,
              stdout: string,
              stderr: string,
            ) => void
          )(
            new Error('git failed'),
            '',
            '',
          );
        }

        return {};
      },
    );

    mockedRm.mockRejectedValue(
      new Error('cleanup failed'),
    );

    await expect(
      createGitRepository('asil', 'demo'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_CREATE_CLEANUP_FAILED',
    });
  });

  it('renames git repository', async () => {
    mockedRename.mockResolvedValue(undefined);

    await expect(
      renameGitRepository(
        'asil',
        'old-name',
        'new-name',
      ),
    ).resolves.toBeUndefined();

    expect(mockedRename).toHaveBeenCalledOnce();

    expect(mockedRename).toHaveBeenCalledWith(
      expect.stringContaining(
        'asil/old-name.git',
      ),
      expect.stringContaining(
        'asil/new-name.git',
      ),
    );
  });

  it('throws when repository rename fails', async () => {
    mockedRename.mockRejectedValue(
      new Error('rename failed'),
    );

    await expect(
      renameGitRepository(
        'asil',
        'old-name',
        'new-name',
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_RENAME_FAILED',
    });
  });

  it('stages repository deletion using atomic rename', async () => {
    mockedRename.mockResolvedValue(undefined);

    const staged =
      await stageGitRepositoryDeletion(
        'asil',
        'demo',
      );

    expect(staged).not.toBeNull();

    expect(staged).toMatchObject({
      username: 'asil',
      repositoryName: 'demo',
    });

    expect(
      staged?.stagedRepositoryName,
    ).toContain('demo.deleting-');

    expect(mockedRename).toHaveBeenCalledWith(
      expect.stringContaining('asil/demo.git'),
      expect.stringContaining(
        'asil/demo.deleting-',
      ),
    );
  });

  it('returns null when repository is already missing during delete staging', async () => {
    mockedRename.mockRejectedValue(
      missingFilesystemEntry(),
    );

    await expect(
      stageGitRepositoryDeletion(
        'asil',
        'demo',
      ),
    ).resolves.toBeNull();
  });

  it('throws when repository deletion staging fails', async () => {
    mockedRename.mockRejectedValue(
      Object.assign(
        new Error('permission denied'),
        {
          code: 'EACCES',
        },
      ),
    );

    await expect(
      stageGitRepositoryDeletion(
        'asil',
        'demo',
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_DELETE_STAGE_FAILED',
    });
  });

  it('restores staged git repository', async () => {
    mockedRename.mockResolvedValue(undefined);

    await expect(
      restoreStagedGitRepositoryDeletion({
        username: 'asil',
        repositoryName: 'demo',
        stagedRepositoryName:
          'demo.deleting-test-id',
      }),
    ).resolves.toBeUndefined();

    expect(mockedRename).toHaveBeenCalledWith(
      expect.stringContaining(
        'asil/demo.deleting-test-id.git',
      ),
      expect.stringContaining(
        'asil/demo.git',
      ),
    );
  });

  it('throws when staged repository restore fails', async () => {
    mockedRename.mockRejectedValue(
      new Error('restore failed'),
    );

    await expect(
      restoreStagedGitRepositoryDeletion({
        username: 'asil',
        repositoryName: 'demo',
        stagedRepositoryName:
          'demo.deleting-test-id',
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_DELETE_RESTORE_FAILED',
    });
  });

  it('finalizes staged git repository deletion', async () => {
    mockedRm.mockResolvedValue(undefined);

    await expect(
      finalizeStagedGitRepositoryDeletion({
        username: 'asil',
        repositoryName: 'demo',
        stagedRepositoryName:
          'demo.deleting-test-id',
      }),
    ).resolves.toBeUndefined();

    expect(mockedRm).toHaveBeenCalledWith(
      expect.stringContaining(
        'asil/demo.deleting-test-id.git',
      ),
      {
        recursive: true,
        force: true,
      },
    );
  });

  it('throws when staged repository finalization fails', async () => {
    mockedRm.mockRejectedValue(
      new Error('remove failed'),
    );

    await expect(
      finalizeStagedGitRepositoryDeletion({
        username: 'asil',
        repositoryName: 'demo',
        stagedRepositoryName:
          'demo.deleting-test-id',
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_DELETE_FINALIZE_FAILED',
    });
  });

  it('deletes git repository directly', async () => {
    mockedRm.mockResolvedValue(undefined);

    await expect(
      deleteGitRepository('asil', 'demo'),
    ).resolves.toBeUndefined();

    expect(mockedRm).toHaveBeenCalledWith(
      expect.stringContaining(
        'asil/demo.git',
      ),
      {
        recursive: true,
        force: true,
      },
    );
  });

  it('throws when direct repository delete fails', async () => {
    mockedRm.mockRejectedValue(
      new Error('delete failed'),
    );

    await expect(
      deleteGitRepository('asil', 'demo'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_DELETE_FAILED',
    });
  });

  it('rejects unsafe path before creating a git repository', async () => {
    await expect(
      createGitRepository(
        '../outside',
        'demo',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedAccess).not.toHaveBeenCalled();
    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('rejects unsafe path before renaming a git repository', async () => {
    await expect(
      renameGitRepository(
        'asil',
        'demo',
        '../outside',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedRename).not.toHaveBeenCalled();
  });

  it('rejects unsafe path before staging repository deletion', async () => {
    await expect(
      stageGitRepositoryDeletion(
        'asil',
        '../outside',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedRename).not.toHaveBeenCalled();
  });

  it('rejects unsafe path before deleting a git repository', async () => {
    await expect(
      deleteGitRepository(
        'asil',
        '../outside',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedRm).not.toHaveBeenCalled();
  });
});
