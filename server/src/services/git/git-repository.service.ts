import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

import { AppError } from '../../errors/app.error.js';
import { env } from '../../config/env.js';

const execFileAsync = promisify(execFile);

const GIT_STORAGE_PATH = path.resolve(process.cwd(), env.GIT_STORAGE_PATH);

const getRepositoryPath = (username: string, repositoryName: string): string => {
  return path.join(GIT_STORAGE_PATH, username, `${repositoryName}.git`);
};

export const createGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<string> => {
  const repositoryPath = getRepositoryPath(username, repositoryName);

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
  const oldRepositoryPath = getRepositoryPath(username, oldRepositoryName);

  const newRepositoryPath = getRepositoryPath(username, newRepositoryName);

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
  const repositoryPath = getRepositoryPath(username, repositoryName);

  try {
    await fs.rm(repositoryPath, {
      recursive: true,
      force: true,
    });
  } catch {
    throw new AppError('Failed to delete Git repository', 500, 'GIT_REPOSITORY_DELETE_FAILED');
  }
};
