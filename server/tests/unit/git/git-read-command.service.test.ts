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

const { executeGitReadCommand, executeGitReadBufferCommand } =
  await import('../../../src/services/git/git-read-command.service.js');

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

describe('Git read command service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('executes binary Git reads without UTF-8 decoding', async () => {
    const binaryOutput = Buffer.from([0x00, 0xff, 0x10, 0x80]);

    mockedExecFile.mockImplementation(
      (_file: unknown, _args: unknown, _options: unknown, callback: unknown) => {
        if (typeof callback === 'function') {
          (callback as (error: Error | null, stdout: Buffer, stderr: Buffer) => void)(
            null,
            binaryOutput,
            Buffer.alloc(0),
          );
        }

        return {};
      },
    );

    const result = await executeGitReadBufferCommand({
      username: 'asil',
      repositoryName: 'demo',

      args: ['cat-file', 'blob', '1111111111111111111111111111111111111111'],
    });

    expect(Buffer.isBuffer(result.stdout)).toBe(true);

    expect(result.stdout).toEqual(binaryOutput);

    expect(mockedExecFile).toHaveBeenCalledWith(
      '/usr/bin/git',

      expect.arrayContaining([
        '--no-pager',
        '--no-optional-locks',
        '--git-dir',
        expect.stringContaining(path.join('asil', 'demo.git')),
        'cat-file',
        'blob',
      ]),

      expect.objectContaining({
        encoding: 'buffer',
        timeout: 5000,
        maxBuffer: 5242880,
        windowsHide: true,
      }),

      expect.any(Function),
    );
  });

  it('uses the minimal child environment for binary Git reads', async () => {
    mockedExecFile.mockImplementation(
      (_file: unknown, _args: unknown, _options: unknown, callback: unknown) => {
        if (typeof callback === 'function') {
          (callback as (error: Error | null, stdout: Buffer, stderr: Buffer) => void)(
            null,
            Buffer.from('data'),
            Buffer.alloc(0),
          );
        }

        return {};
      },
    );

    await executeGitReadBufferCommand({
      username: 'asil',
      repositoryName: 'demo',

      args: ['cat-file', 'blob', '1111111111111111111111111111111111111111'],
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

      GIT_OPTIONAL_LOCKS: '0',
    });

    expect(options.env).not.toHaveProperty('DATABASE_URL');

    expect(options.env).not.toHaveProperty('JWT_ACCESS_SECRET');
  });

  it('rejects unsafe repository identity before binary Git execution', async () => {
    await expect(
      executeGitReadBufferCommand({
        username: '../outside',

        repositoryName: 'demo',

        args: ['cat-file', 'blob', '1111111111111111111111111111111111111111'],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });
  it('executes Git against the resolved bare repository', async () => {
    mockSuccess('true\nsha1\n');

    const result = await executeGitReadCommand({
      username: 'asil',
      repositoryName: 'demo',

      args: ['rev-parse', '--is-bare-repository'],
    });

    expect(result).toEqual({
      stdout: 'true\nsha1\n',
      stderr: '',
    });

    expect(mockedExecFile).toHaveBeenCalledOnce();

    expect(mockedExecFile).toHaveBeenCalledWith(
      '/usr/bin/git',

      expect.arrayContaining([
        '--no-pager',
        '--no-optional-locks',
        '--git-dir',
        expect.stringContaining(path.join('asil', 'demo.git')),
        'rev-parse',
        '--is-bare-repository',
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

  it('uses a minimal child process environment', async () => {
    mockSuccess('true\n');

    await executeGitReadCommand({
      username: 'asil',
      repositoryName: 'demo',
      args: ['rev-parse', '--is-bare-repository'],
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

      GIT_OPTIONAL_LOCKS: '0',
    });

    expect(options.env).not.toHaveProperty('DATABASE_URL');

    expect(options.env).not.toHaveProperty('JWT_ACCESS_SECRET');
  });

  it('rejects unsafe repository identity before executing Git', async () => {
    await expect(
      executeGitReadCommand({
        username: '../outside',

        repositoryName: 'demo',

        args: ['rev-parse'],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_REPOSITORY_PATH',
    });

    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('rejects an empty command', async () => {
    await expect(
      executeGitReadCommand({
        username: 'asil',
        repositoryName: 'demo',
        args: [],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_READ_COMMAND_FAILED',
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
      executeGitReadCommand({
        username: 'asil',
        repositoryName: 'demo',

        args: ['rev-parse'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_EXECUTABLE_NOT_FOUND',
    });
  });

  it('maps Git command timeout', async () => {
    mockFailure(
      Object.assign(new Error('command timed out'), {
        killed: true,
        signal: 'SIGTERM',
      }),
    );

    await expect(
      executeGitReadCommand({
        username: 'asil',
        repositoryName: 'demo',

        args: ['rev-parse'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_READ_TIMEOUT',
    });
  });

  it('maps max buffer failures', async () => {
    mockFailure(
      Object.assign(new Error('stdout maxBuffer exceeded'), {
        code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      }),
    );

    await expect(
      executeGitReadCommand({
        username: 'asil',
        repositoryName: 'demo',

        args: ['cat-file'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_READ_OUTPUT_LIMIT_EXCEEDED',
    });
  });

  it('preserves command exit code and bounded stderr for internal handling', async () => {
    mockFailure(
      Object.assign(new Error('Git command failed'), {
        code: 128,
        stderr: 'fatal: bad revision\n',
      }),
    );

    await expect(
      executeGitReadCommand({
        username: 'asil',
        repositoryName: 'demo',

        args: ['rev-parse', 'missing'],
      }),
    ).rejects.toMatchObject({
      code: 'GIT_READ_COMMAND_FAILED',

      exitCode: 128,

      stderr: 'fatal: bad revision\n',
    });
  });
});
