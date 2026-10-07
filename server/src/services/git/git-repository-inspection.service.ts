import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import { executeGitReadCommand } from './git-read-command.service.js';

export type GitObjectFormat = 'sha1' | 'sha256';

export type GitRepositoryInspection = {
  isBare: true;
  objectFormat: GitObjectFormat;
};

const parseRepositoryInspection = (stdout: string): GitRepositoryInspection => {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bareValue = lines[0];

  const objectFormat = lines[1];

  if (bareValue !== 'true') {
    throw new AppError('Git repository is not a bare repository', 500, 'GIT_REPOSITORY_INVALID');
  }

  if (objectFormat !== 'sha1' && objectFormat !== 'sha256') {
    throw new AppError(
      'Git repository uses an unsupported object format',
      500,
      'GIT_REPOSITORY_OBJECT_FORMAT_UNSUPPORTED',
    );
  }

  return {
    isBare: true,
    objectFormat,
  };
};

export const inspectGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<GitRepositoryInspection> => {
  try {
    const result = await executeGitReadCommand({
      username,
      repositoryName,

      args: ['rev-parse', '--is-bare-repository', '--show-object-format'],
    });

    return parseRepositoryInspection(result.stdout);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof GitReadError) {
      throw new AppError('Failed to read Git repository data', 500, 'GIT_REPOSITORY_READ_FAILED');
    }

    throw error;
  }
};
