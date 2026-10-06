import { AppError } from '../../errors/app.error.js';
import { isSafeGitRefName } from '../../utils/git/ref-name.js';
import { getGitRepositoryRefs, type GitReference } from './git-ref.service.js';

export type GitBranchDetails = GitReference & {
  isDefault: boolean;
};

export const getGitBranch = async (
  username: string,
  repositoryName: string,
  branchName: string,
): Promise<GitBranchDetails> => {
  if (!isSafeGitRefName(branchName)) {
    throw new AppError('Invalid Git branch name', 400, 'INVALID_GIT_BRANCH_NAME');
  }

  const refs = await getGitRepositoryRefs(username, repositoryName);

  const branch = refs.branches.find((reference) => reference.name === branchName);

  if (!branch) {
    throw new AppError('Git branch not found', 404, 'GIT_BRANCH_NOT_FOUND');
  }

  return {
    ...branch,
    isDefault: branch.name === refs.defaultBranch,
  };
};
