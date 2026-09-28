import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

import { AppError } from '../../errors/app.error.js';
import { resolveGitRepositoryPath } from '../../utils/git/repository-path.js';

const execFileAsync = promisify(execFile);

export type StagedGitRepositoryDeletion = {
  username: string;
  repositoryName: string;
  stagedRepositoryName: string;
};

const hasErrorCode = (error: unknown, code: string): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as NodeJS.ErrnoException).code === code;
};

export const createGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<string> => {
  const repositoryPath = resolveGitRepositoryPath(username, repositoryName);

  try {
    await fs.access(repositoryPath);

    throw new AppError(
      'Git repository path already exists',
      409,
      'GIT_REPOSITORY_ALREADY_EXISTS',
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (!hasErrorCode(error, 'ENOENT')) {
      throw new AppError(
        'Failed to inspect Git repository path',
        500,
        'GIT_REPOSITORY_INSPECTION_FAILED',
      );
    }
  }

  try {
    await execFileAsync('git', [
      'init',
      '--bare',
      '--initial-branch=main',
      repositoryPath,
    ]);

    await execFileAsync('git', [
      '--git-dir',
      repositoryPath,
      'config',
      'http.receivepack',
      'true',
    ]);
  } catch {
    try {
      await fs.rm(repositoryPath, {
        recursive: true,
        force: true,
      });
    } catch {
      throw new AppError(
        'Failed to clean up partially created Git repository',
        500,
        'GIT_REPOSITORY_CREATE_CLEANUP_FAILED',
      );
    }

    throw new AppError(
      'Failed to create Git repository',
      500,
      'GIT_REPOSITORY_CREATE_FAILED',
    );
  }

  return repositoryPath;
};

export const renameGitRepository = async (
  username: string,
  oldRepositoryName: string,
  newRepositoryName: string,
): Promise<void> => {
  const oldRepositoryPath = resolveGitRepositoryPath(
    username,
    oldRepositoryName,
  );

  const newRepositoryPath = resolveGitRepositoryPath(
    username,
    newRepositoryName,
  );

  try {
    await fs.rename(oldRepositoryPath, newRepositoryPath);
  } catch {
    throw new AppError(
      'Failed to rename Git repository',
      500,
      'GIT_REPOSITORY_RENAME_FAILED',
    );
  }
};

export const stageGitRepositoryDeletion = async (
  username: string,
  repositoryName: string,
): Promise<StagedGitRepositoryDeletion | null> => {
  const originalPath = resolveGitRepositoryPath(username, repositoryName);

  const stagedRepositoryName =
    `${repositoryName}.deleting-${randomUUID()}`;

  const stagedPath = resolveGitRepositoryPath(
    username,
    stagedRepositoryName,
  );

  try {
    await fs.rename(originalPath, stagedPath);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }

    throw new AppError(
      'Failed to stage Git repository deletion',
      500,
      'GIT_REPOSITORY_DELETE_STAGE_FAILED',
    );
  }

  return {
    username,
    repositoryName,
    stagedRepositoryName,
  };
};

export const restoreStagedGitRepositoryDeletion = async (
  stagedDeletion: StagedGitRepositoryDeletion,
): Promise<void> => {
  const originalPath = resolveGitRepositoryPath(
    stagedDeletion.username,
    stagedDeletion.repositoryName,
  );

  const stagedPath = resolveGitRepositoryPath(
    stagedDeletion.username,
    stagedDeletion.stagedRepositoryName,
  );

  try {
    await fs.rename(stagedPath, originalPath);
  } catch {
    throw new AppError(
      'Failed to restore staged Git repository',
      500,
      'GIT_REPOSITORY_DELETE_RESTORE_FAILED',
    );
  }
};

export const finalizeStagedGitRepositoryDeletion = async (
  stagedDeletion: StagedGitRepositoryDeletion,
): Promise<void> => {
  const stagedPath = resolveGitRepositoryPath(
    stagedDeletion.username,
    stagedDeletion.stagedRepositoryName,
  );

  try {
    await fs.rm(stagedPath, {
      recursive: true,
      force: true,
    });
  } catch {
    throw new AppError(
      'Failed to finalize Git repository deletion',
      500,
      'GIT_REPOSITORY_DELETE_FINALIZE_FAILED',
    );
  }
};

export const deleteGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<void> => {
  const repositoryPath = resolveGitRepositoryPath(
    username,
    repositoryName,
  );

  try {
    await fs.rm(repositoryPath, {
      recursive: true,
      force: true,
    });
  } catch {
    throw new AppError(
      'Failed to delete Git repository',
      500,
      'GIT_REPOSITORY_DELETE_FAILED',
    );
  }
};
