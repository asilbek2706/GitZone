import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedExecFile, mockedRename, mockedRm } = vi.hoisted(() => ({
  mockedExecFile: vi.fn(),
  mockedRename: vi.fn(),
  mockedRm: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: mockedExecFile,
}));

vi.mock('node:fs/promises', () => ({
  default: {
    rename: mockedRename,
    rm: mockedRm,
  },
}));

process.env.GIT_STORAGE_PATH = './storage/test-repositories';

const { createGitRepository, renameGitRepository, deleteGitRepository } =
  await import('../../../src/services/git/git-repository.service.js');

describe('git repository service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a bare git repository', async () => {
    mockedExecFile.mockImplementation((_file: unknown, _args: unknown, callback: unknown) => {
      if (typeof callback === 'function') {
        (callback as (error: Error | null, stdout: string, stderr: string) => void)(null, '', '');
      }

      return {};
    });

    const result = await createGitRepository('asil', 'demo');

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

  it('throws when git repository creation fails', async () => {
    mockedExecFile.mockImplementation((_file: unknown, _args: unknown, callback: unknown) => {
      if (typeof callback === 'function') {
        (callback as (error: Error | null, stdout: string, stderr: string) => void)(
          new Error('git failed'),
          '',
          '',
        );
      }

      return {};
    });

    await expect(createGitRepository('asil', 'demo')).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_CREATE_FAILED',
    });
  });

  it('renames git repository', async () => {
    mockedRename.mockResolvedValue(undefined);

    await expect(renameGitRepository('asil', 'old-name', 'new-name')).resolves.toBeUndefined();

    expect(mockedRename).toHaveBeenCalledOnce();

    expect(mockedRename).toHaveBeenCalledWith(
      expect.stringContaining('asil/old-name.git'),
      expect.stringContaining('asil/new-name.git'),
    );
  });

  it('throws when repository rename fails', async () => {
    mockedRename.mockRejectedValue(new Error('rename failed'));

    await expect(renameGitRepository('asil', 'old-name', 'new-name')).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_RENAME_FAILED',
    });
  });

  it('deletes git repository', async () => {
    mockedRm.mockResolvedValue(undefined);

    await expect(deleteGitRepository('asil', 'demo')).resolves.toBeUndefined();

    expect(mockedRm).toHaveBeenCalledOnce();

    expect(mockedRm).toHaveBeenCalledWith(expect.stringContaining('asil/demo.git'), {
      recursive: true,
      force: true,
    });
  });

  it('throws when repository delete fails', async () => {
    mockedRm.mockRejectedValue(new Error('delete failed'));

    await expect(deleteGitRepository('asil', 'demo')).rejects.toMatchObject({
      statusCode: 500,
      code: 'GIT_REPOSITORY_DELETE_FAILED',
    });
  });

  it('rejects unsafe path before creating a git repository', async () => {
    await expect(createGitRepository('../outside', 'demo')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('rejects unsafe path before renaming a git repository', async () => {
    await expect(
      renameGitRepository('asil', 'demo', '../outside'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedRename).not.toHaveBeenCalled();
  });

  it('rejects unsafe path before deleting a git repository', async () => {
    await expect(
      deleteGitRepository('asil', '../outside'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedRm).not.toHaveBeenCalled();
  });

});
