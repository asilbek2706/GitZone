import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitReadError } from '../../../src/errors/git-read.error.js';

const { mockedExecuteGitReadCommand } = vi.hoisted(() => ({
  mockedExecuteGitReadCommand: vi.fn(),
}));

vi.mock('../../../src/services/git/git-read-command.service.js', () => ({
  executeGitReadCommand: mockedExecuteGitReadCommand,
}));

const { inspectGitRepository } =
  await import('../../../src/services/git/git-repository-inspection.service.js');

describe('Git repository inspection service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('inspects a SHA-1 bare repository', async () => {
    mockedExecuteGitReadCommand.mockResolvedValue({
      stdout: 'true\nsha1\n',
      stderr: '',
    });

    await expect(inspectGitRepository('asil', 'demo')).resolves.toEqual({
      isBare: true,
      objectFormat: 'sha1',
    });

    expect(mockedExecuteGitReadCommand).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',

      args: ['rev-parse', '--is-bare-repository', '--show-object-format'],
    });
  });

  it('supports SHA-256 repositories', async () => {
    mockedExecuteGitReadCommand.mockResolvedValue({
      stdout: 'true\nsha256\n',
      stderr: '',
    });

    await expect(inspectGitRepository('asil', 'demo')).resolves.toEqual({
      isBare: true,
      objectFormat: 'sha256',
    });
  });

  it('rejects a non-bare repository', async () => {
    mockedExecuteGitReadCommand.mockResolvedValue({
      stdout: 'false\nsha1\n',
      stderr: '',
    });

    await expect(inspectGitRepository('asil', 'demo')).rejects.toMatchObject({
      statusCode: 500,

      code: 'GIT_REPOSITORY_INVALID',
    });
  });

  it('rejects an unsupported object format', async () => {
    mockedExecuteGitReadCommand.mockResolvedValue({
      stdout: 'true\nunknown\n',
      stderr: '',
    });

    await expect(inspectGitRepository('asil', 'demo')).rejects.toMatchObject({
      statusCode: 500,

      code: 'GIT_REPOSITORY_OBJECT_FORMAT_UNSUPPORTED',
    });
  });

  it('maps internal Git read failures to a safe application error', async () => {
    mockedExecuteGitReadCommand.mockRejectedValue(
      new GitReadError('internal failure', 'GIT_READ_COMMAND_FAILED', {
        exitCode: 128,
        stderr: 'fatal: internal git details',
      }),
    );

    await expect(inspectGitRepository('asil', 'demo')).rejects.toMatchObject({
      statusCode: 500,

      code: 'GIT_REPOSITORY_READ_FAILED',

      message: 'Failed to read Git repository data',
    });
  });
});
