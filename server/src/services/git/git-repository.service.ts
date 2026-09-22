import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

import { AppError } from '../../errors/app.error.js';
import { resolveGitRepositoryPath } from '../../utils/git/repository-path.js';

const execFileAsync = promisify(execFile);

export const createGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<string> => {
  const repositoryPath = resolveGitRepositoryPath(username, repositoryName);

  try {
    await execFileAsync('git', ['init', '--bare', '--initial-branch=main', repositoryPath]);

    await execFileAsync('git', ['--git-dir', repositoryPath, 'config', 'http.receivepack', 'true']);
  } catch {
    throw new AppError('Failed to create Git repository', 500, 'GIT_REPOSITORY_CREATE_FAILED');
  }

  return repositoryPath;
};

export const renameGitRepository = async (
  username: string,
  oldRepositoryName: string,
  newRepositoryName: string,
): Promise<void> => {
  const oldRepositoryPath = resolveGitRepositoryPath(username, oldRepositoryName);

  const newRepositoryPath = resolveGitRepositoryPath(username, newRepositoryName);

  try {
    await fs.rename(oldRepositoryPath, newRepositoryPath);
  } catch {
    throw new AppError('Failed to rename Git repository', 500, 'GIT_REPOSITORY_RENAME_FAILED');
  }
};

export const deleteGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<void> => {
  const repositoryPath = resolveGitRepositoryPath(username, repositoryName);

  try {
    await fs.rm(repositoryPath, {
      recursive: true,
      force: true,
    });
  } catch {
    throw new AppError('Failed to delete Git repository', 500, 'GIT_REPOSITORY_DELETE_FAILED');
  }
};
