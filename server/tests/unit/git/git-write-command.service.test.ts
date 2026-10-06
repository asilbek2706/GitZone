import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedExecFile } = vi.hoisted(() => ({
  mockedExecFile: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: mockedExecFile,
}));

process.env.GIT_STORAGE_PATH = './storage/test-repositories';

process.env.GIT_EXECUTABLE_PATH = '/usr/bin/git';

process.env.GIT_CHILD_PATH = '/usr/bin:/bin';

process.env.GIT_READ_TIMEOUT_MS = '5000';

process.env.GIT_READ_MAX_BUFFER_BYTES = '5242880';

process.env.DATABASE_URL = 'postgresql://secret-database';

process.env.JWT_ACCESS_SECRET = 'secret-access-token-that-must-not-leak';

const { executeGitWriteCommand } =
  await import('../../../src/services/git/git-write-command.service.js');

const mockSuccess = (stdout = '', stderr = ''): void => {
  mockedExecFile.mockImplementation(
    (_file: unknown, _args: unknown, _options: unknown, callback: unknown) => {
      if (typeof callback === 'function') {
        (callback as (error: Error | null, stdout: string, stderr: string) => void)(
          null,
          stdout,
          stderr,
        );
      }

      return {};
    },
  );
};

const mockFailure = (error: Error): void => {
  mockedExecFile.mockImplementation(
    (_file: unknown, _args: unknown, _options: unknown, callback: unknown) => {
      if (typeof callback === 'function') {
        (callback as (error: Error, stdout: string, stderr: string) => void)(error, '', '');
      }

      return {};
    },
  );
};

describe('Git write command service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('executes Git mutation against the resolved bare repository', async () => {
    mockSuccess();

    const result = await executeGitWriteCommand({
      username: 'asil',
      repositoryName: 'demo',

      args: ['update-ref', 'refs/heads/develop', '1111111111111111111111111111111111111111'],
    });

    expect(result).toEqual({
      stdout: '',
      stderr: '',
    });

    expect(mockedExecFile).toHaveBeenCalledOnce();

    expect(mockedExecFile).toHaveBeenCalledWith(
      '/usr/bin/git',

      expect.arrayContaining([
        '--no-pager',
        '--git-dir',
        expect.stringContaining(path.join('asil', 'demo.git')),
        'update-ref',
        'refs/heads/develop',
      ]),

      expect.objectContaining({
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 5242880,
        windowsHide: true,
      }),

      expect.any(Function),
    );
  });

  it('keeps Git locking enabled for mutations', async () => {
    mockSuccess();

    await executeGitWriteCommand({
      username: 'asil',
      repositoryName: 'demo',
      args: ['update-ref', 'refs/heads/develop', '1111111111111111111111111111111111111111'],
    });

    const args = mockedExecFile.mock.calls[0]?.[1] as string[];

    expect(args).not.toContain('--no-optional-locks');
  });

  it('uses a minimal child process environment without server secrets', async () => {
    mockSuccess();

    await executeGitWriteCommand({
      username: 'asil',
      repositoryName: 'demo',
      args: ['update-ref', 'refs/heads/develop', '1111111111111111111111111111111111111111'],
    });

    const options = mockedExecFile.mock.calls[0]?.[2] as {
      env?: NodeJS.ProcessEnv;
    };

    expect(options.env).toEqual({
      PATH: '/usr/bin:/bin',

      LANG: 'C',

      LC_ALL: 'C',

      GIT_CONFIG_NOSYSTEM: '1',

      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    });

    expect(options.env).not.toHaveProperty('DATABASE_URL');

    expect(options.env).not.toHaveProperty('JWT_ACCESS_SECRET');

    expect(options.env).not.toHaveProperty('GIT_OPTIONAL_LOCKS');
  });

  it('rejects unsafe repository identity before executing Git', async () => {
    await expect(
      executeGitWriteCommand({
        username: '../outside',

        repositoryName: 'demo',

        args: ['update-ref', 'refs/heads/develop', '1111111111111111111111111111111111111111'],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('rejects an empty command before executing Git', async () => {
    await expect(
      executeGitWriteCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: [],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_WRITE_COMMAND_FAILED',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('maps a missing Git executable', async () => {
    mockFailure(
      Object.assign(new Error('spawn git ENOENT'), {
        code: 'ENOENT',
      }),
    );

    await expect(
      executeGitWriteCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: ['update-ref'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_EXECUTABLE_NOT_FOUND',
    });
  });

  it('maps Git write timeout', async () => {
    mockFailure(
      Object.assign(new Error('command timed out'), {
        killed: true,
        signal: 'SIGTERM',
      }),
    );

    await expect(
      executeGitWriteCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: ['update-ref'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_WRITE_TIMEOUT',
    });
  });

  it('maps max buffer failures', async () => {
    mockFailure(
      Object.assign(new Error('stdout maxBuffer exceeded'), {
        code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      }),
    );

    await expect(
      executeGitWriteCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: ['update-ref'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_WRITE_OUTPUT_LIMIT_EXCEEDED',
    });
  });

  it('preserves exit code and bounded stderr for internal handling', async () => {
    mockFailure(
      Object.assign(new Error('Git command failed'), {
        code: 128,
        stderr: 'fatal: cannot lock ref\n',
      }),
    );

    await expect(
      executeGitWriteCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: ['update-ref'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_WRITE_COMMAND_FAILED',

      exitCode: 128,

      stderr: 'fatal: cannot lock ref\n',
    });
  });
});
