import { env } from '../../config/env.js';
import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import { executeGitReadCommand } from './git-read-command.service.js';
import { getGitRepositoryRefs, type GitReference } from './git-ref.service.js';
import { assertSafeGitTreePath } from '../../utils/git/tree-path.js';

const assertGitFileSizeAllowed = (size: number): void => {
  if (size > env.GIT_MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      'Git file exceeds the maximum readable size',
      413,
      'GIT_FILE_TOO_LARGE',
    );
  }
};

export type GitBlobContent = {
  path: string;
  ref: string;
  oid: string;
  size: number;
  encoding: 'utf-8';
  content: string;
};

const selectRef = (
  branches: GitReference[],
  tags: GitReference[],
  requested: string | undefined,
): GitReference => {
  const selected =
    requested === undefined
      ? branches[0]
      : branches.find((ref) => ref.name === requested) ??
        tags.find((ref) => ref.name === requested);
  if (!selected) {
    throw new AppError('Git reference not found', 404, 'GIT_REF_NOT_FOUND');
  }
  return selected;
};

export const getGitBlobContent = async (
  username: string,
  repositoryName: string,
  requestedRef: string | undefined,
  path: string,
): Promise<GitBlobContent> => {
  assertSafeGitTreePath(path);
  if (path === '') {
    throw new AppError('A file path is required', 400, 'INVALID_GIT_FILE_PATH');
  }

  try {
    const refs = await getGitRepositoryRefs(username, repositoryName);
    const selected =
      requestedRef === undefined
        ? refs.head ?? refs.branches[0]
        : selectRef(refs.branches, refs.tags, requestedRef);
    if (!selected) {
      throw new AppError('Git reference not found', 404, 'GIT_REF_NOT_FOUND');
    }
    const objectResult = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['rev-parse', '--verify', '--end-of-options', `${selected.fullName}:${path}`],
    });
    const oid = objectResult.stdout.trim();
    const oidPattern = refs.objectFormat === 'sha1' ? /^[0-9a-f]{40}$/i : /^[0-9a-f]{64}$/i;
    if (!oidPattern.test(oid)) {
      throw new AppError('Git repository contains invalid blob data', 500, 'GIT_BLOB_DATA_INVALID');
    }
    const typeResult = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', '-t', oid],
    });
    if (typeResult.stdout.trim() !== 'blob') {
      throw new AppError('Git path is not a file', 404, 'GIT_FILE_NOT_FOUND');
    }
    const sizeResult = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', '-s', oid],
    });
    const size = Number(sizeResult.stdout.trim());
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new AppError('Git repository contains invalid blob data', 500, 'GIT_BLOB_DATA_INVALID');
    }

    assertGitFileSizeAllowed(size);
    const contentResult = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', 'blob', oid],
    });
    return {
      path,
      ref: selected.name,
      oid,
      size,
      encoding: 'utf-8',
      content: contentResult.stdout,
    };

  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof GitReadError && error.code === 'GIT_READ_COMMAND_FAILED' && error.exitCode === 128) {
      throw new AppError('Git file not found', 404, 'GIT_FILE_NOT_FOUND');
    }
    throw new AppError('Failed to read Git file', 500, 'GIT_FILE_READ_FAILED');
  }
};

export const getGitBlobContentBySha = async (
  username: string,
  repositoryName: string,
  sha: string,
): Promise<Omit<GitBlobContent, 'path' | 'ref'>> => {
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/i.test(sha)) {
    throw new AppError('Invalid blob SHA', 400, 'INVALID_GIT_BLOB_SHA');
  }
  try {
    const type = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', '-t', sha],
    });
    if (type.stdout.trim() !== 'blob') {
      throw new AppError('Git object is not a blob', 404, 'GIT_BLOB_NOT_FOUND');
    }
    const sizeResult = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', '-s', sha],
    });
    const size = Number(sizeResult.stdout.trim());
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new AppError('Git repository contains invalid blob data', 500, 'GIT_BLOB_DATA_INVALID');
    }

    assertGitFileSizeAllowed(size);
    const content = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['cat-file', 'blob', sha],
    });
    return { oid: sha, size, encoding: 'utf-8', content: content.stdout };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof GitReadError && error.code === 'GIT_READ_COMMAND_FAILED' && error.exitCode === 128) {
      throw new AppError('Git blob not found', 404, 'GIT_BLOB_NOT_FOUND');
    }
    throw new AppError('Failed to read Git blob', 500, 'GIT_BLOB_READ_FAILED');
  }
};
