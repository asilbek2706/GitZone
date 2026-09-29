import {
  execFile,
} from 'node:child_process';

import { env } from '../../config/env.js';
import {
  GitReadError,
} from '../../errors/git-read.error.js';
import {
  resolveGitRepositoryPath,
} from '../../utils/git/repository-path.js';

const STDERR_PREVIEW_LIMIT = 4096;

type ExecuteGitReadCommandInput = {
  username: string;
  repositoryName: string;
  args: readonly string[];
};

export type GitReadCommandResult = {
  stdout: string;
  stderr: string;
};

type ChildProcessFailure = Error & {
  code?: string | number;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
  stderr?: string | Buffer;
};

const getStderrPreview = (
  error: ChildProcessFailure,
): string => {
  const stderr =
    error.stderr === undefined
      ? ''
      : String(error.stderr);

  return stderr.slice(
    0,
    STDERR_PREVIEW_LIMIT,
  );
};

const createSafeGitReadEnvironment =
  (): NodeJS.ProcessEnv => ({
    PATH: '/usr/bin:/bin',

    LANG: 'C.UTF-8',

    /*
     * Never inherit the Node.js server environment.
     *
     * DATABASE_URL, JWT secrets, encryption keys,
     * access tokens and unrelated host variables
     * must never reach Git child processes.
     */
    GIT_CONFIG_NOSYSTEM: '1',

    GIT_CONFIG_GLOBAL: '/dev/null',

    /*
     * Read-only Git commands should not create
     * optional repository lock files.
     */
    GIT_OPTIONAL_LOCKS: '0',
  });

const executeGitFile = (
  args: string[],
): Promise<GitReadCommandResult> => {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      execFile(
        'git',
        args,
        {
          encoding: 'utf8',

          timeout:
            env.GIT_READ_TIMEOUT_MS,

          maxBuffer:
            env.GIT_READ_MAX_BUFFER_BYTES,

          windowsHide: true,

          env:
            createSafeGitReadEnvironment(),
        },
        (
          error,
          stdout,
          stderr,
        ) => {
          if (error) {
            /*
             * Keep stderr attached to the internal
             * error so the mapper can classify and
             * inspect a bounded diagnostic message.
             */
            const failure =
              error as ChildProcessFailure;

            /*
             * Node normally provides stderr through the
             * callback. Preserve an existing error.stderr
             * value when the callback value is empty.
             */
            if (
              stderr.length > 0 ||
              failure.stderr === undefined
            ) {
              failure.stderr =
                stderr;
            }

            reject(failure);

            return;
          }

          resolve({
            stdout:
              String(stdout),

            stderr:
              String(stderr),
          });
        },
      );
    },
  );
};

const mapGitReadFailure = (
  error: unknown,
): GitReadError => {
  const failure =
    error as ChildProcessFailure;

  const stderr =
    getStderrPreview(failure);

  if (failure.code === 'ENOENT') {
    return new GitReadError(
      'Git executable could not be found',
      'GIT_EXECUTABLE_NOT_FOUND',
      {
        stderr,
        cause: error,
      },
    );
  }

  if (
    failure.code ===
    'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
  ) {
    return new GitReadError(
      'Git read output exceeded the configured limit',
      'GIT_READ_OUTPUT_LIMIT_EXCEEDED',
      {
        stderr,
        cause: error,
      },
    );
  }

  if (
    failure.killed === true ||
    failure.signal === 'SIGTERM'
  ) {
    return new GitReadError(
      'Git read command timed out',
      'GIT_READ_TIMEOUT',
      {
        stderr,
        cause: error,
      },
    );
  }

  return new GitReadError(
    'Git read command failed',
    'GIT_READ_COMMAND_FAILED',
    {
      exitCode:
        typeof failure.code === 'number'
          ? failure.code
          : null,

      stderr,

      cause: error,
    },
  );
};

export const executeGitReadCommand = async ({
  username,
  repositoryName,
  args,
}: ExecuteGitReadCommandInput): Promise<GitReadCommandResult> => {
  if (args.length === 0) {
    throw new GitReadError(
      'Git read command arguments are required',
      'GIT_READ_COMMAND_FAILED',
    );
  }

  /*
   * Repository identity and filesystem boundary
   * validation always happens before spawning Git.
   */
  const repositoryPath =
    resolveGitRepositoryPath(
      username,
      repositoryName,
    );

  const commandArgs = [
    '--no-pager',
    '--no-optional-locks',

    '--git-dir',
    repositoryPath,

    ...args,
  ];

  try {
    return await executeGitFile(
      commandArgs,
    );
  } catch (error) {
    if (error instanceof GitReadError) {
      throw error;
    }

    throw mapGitReadFailure(
      error,
    );
  }
};
