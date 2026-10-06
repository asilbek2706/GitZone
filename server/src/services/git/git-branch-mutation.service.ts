import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import { GitWriteError } from '../../errors/git-write.error.js';
import { isSafeGitRefName } from '../../utils/git/ref-name.js';
import { executeGitReadCommand } from './git-read-command.service.js';
import { getGitRepositoryRefs, type GitReference } from './git-ref.service.js';
import { executeGitWriteCommand } from './git-write-command.service.js';

const ZERO_SHA1 = '0000000000000000000000000000000000000000';

const ZERO_SHA256 = '0000000000000000000000000000000000000000000000000000000000000000';

export type CreateGitBranchInput = {
  username: string;
  repositoryName: string;
  branchName: string;
  from?: string;
};

export type CreatedGitBranch = GitReference & {
  isDefault: boolean;
};

const validateBranchName = async (
  username: string,
  repositoryName: string,
  branchName: string,
): Promise<void> => {
  if (!isSafeGitRefName(branchName)) {
    throw new AppError('Invalid Git branch name', 400, 'INVALID_GIT_BRANCH_NAME');
  }

  try {
    await executeGitReadCommand({
      username,
      repositoryName,
      args: ['check-ref-format', '--branch', branchName],
    });
  } catch (error) {
    if (error instanceof GitReadError && error.code === 'GIT_READ_COMMAND_FAILED') {
      throw new AppError('Invalid Git branch name', 400, 'INVALID_GIT_BRANCH_NAME');
    }

    throw error;
  }
};

const getZeroOid = (objectFormat: 'sha1' | 'sha256'): string =>
  objectFormat === 'sha256' ? ZERO_SHA256 : ZERO_SHA1;

export const createGitBranch = async ({
  username,
  repositoryName,
  branchName,
  from,
}: CreateGitBranchInput): Promise<CreatedGitBranch> => {
  await validateBranchName(username, repositoryName, branchName);

  if (from !== undefined) {
    await validateBranchName(username, repositoryName, from);
  }

  const refs = await getGitRepositoryRefs(username, repositoryName);

  if (refs.branches.some((branch) => branch.name === branchName)) {
    throw new AppError('Git branch already exists', 409, 'GIT_BRANCH_ALREADY_EXISTS');
  }

  const sourceBranchName = from ?? refs.defaultBranch;

  const sourceBranch = refs.branches.find((branch) => branch.name === sourceBranchName);

  if (!sourceBranch) {
    throw new AppError('Source Git branch not found', 404, 'GIT_SOURCE_BRANCH_NOT_FOUND');
  }

  const fullName = `refs/heads/${branchName}`;

  try {
    await executeGitWriteCommand({
      username,
      repositoryName,
      args: ['update-ref', fullName, sourceBranch.oid, getZeroOid(refs.objectFormat)],
    });
  } catch (error) {
    if (error instanceof GitWriteError && error.code === 'GIT_WRITE_COMMAND_FAILED') {
      /*
       * update-ref uses compare-and-swap semantics.
       * A concurrent creator may have created this
       * ref after the initial refs snapshot.
       */
      throw new AppError('Git branch creation conflict', 409, 'GIT_BRANCH_CONFLICT');
    }

    throw error;
  }

  return {
    name: branchName,
    fullName,
    oid: sourceBranch.oid,
    objectType: sourceBranch.objectType,
    isDefault: false,
  };
};
