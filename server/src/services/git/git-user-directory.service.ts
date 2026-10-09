import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app.error.js';
import { resolveGitRepositoryPath } from '../../utils/git/repository-path.js';

const storageRoot = path.resolve(process.cwd(), env.GIT_STORAGE_PATH);

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as NodeJS.ErrnoException).code === code;

const resolveUserDirectory = (username: string): string => {
  // Reuse the existing Git path validator.
  const sampleRepositoryPath = resolveGitRepositoryPath(username, 'username-directory-validation');

  return path.dirname(sampleRepositoryPath);
};

export const renameGitUserDirectory = async (
  oldUsername: string,
  newUsername: string,
): Promise<boolean> => {
  const source = resolveUserDirectory(oldUsername);
  const destination = resolveUserDirectory(newUsername);

  if (oldUsername === newUsername) {
    return false;
  }

  if (oldUsername.toLowerCase() === newUsername.toLowerCase()) {
    throw new AppError(
      'Case-only username changes are not supported',
      409,
      'GIT_USERNAME_CASE_CONFLICT',
    );
  }

  try {
    const sourceStat = await fs.lstat(source);

    if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
      throw new AppError(
        'Git user storage directory is invalid',
        409,
        'GIT_USER_DIRECTORY_INVALID',
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (hasErrorCode(error, 'ENOENT')) {
      return false;
    }

    throw new AppError(
      'Failed to inspect Git user storage directory',
      500,
      'GIT_USER_DIRECTORY_INSPECTION_FAILED',
    );
  }

  try {
    await fs.lstat(destination);

    throw new AppError(
      'Target Git user directory already exists',
      409,
      'GIT_USER_DIRECTORY_ALREADY_EXISTS',
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (!hasErrorCode(error, 'ENOENT')) {
      throw new AppError(
        'Failed to inspect target Git user directory',
        500,
        'GIT_USER_DIRECTORY_INSPECTION_FAILED',
      );
    }
  }

  // The source and destination must remain within the same storage root.
  if (path.dirname(source) !== storageRoot || path.dirname(destination) !== storageRoot) {
    throw new AppError(
      'Git user directory escapes storage root',
      400,
      'INVALID_GIT_REPOSITORY_PATH',
    );
  }

  try {
    await fs.rename(source, destination);
  } catch (error) {
    if (hasErrorCode(error, 'EEXIST') || hasErrorCode(error, 'ENOTEMPTY')) {
      throw new AppError(
        'Target Git user directory already exists',
        409,
        'GIT_USER_DIRECTORY_ALREADY_EXISTS',
      );
    }

    throw new AppError(
      'Failed to rename Git user directory',
      500,
      'GIT_USER_DIRECTORY_RENAME_FAILED',
    );
  }

  return true;
};
