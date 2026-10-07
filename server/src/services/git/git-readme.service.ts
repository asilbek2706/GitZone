import { AppError } from '../../errors/app.error.js';
import { getGitBlobContentBySha, type GitBlobContent } from './git-content.service.js';
import { getGitRepositoryTree } from './git-tree.service.js';

const README_NAMES = [
  'README.md',
  'README.markdown',
  'README.mdown',
  'README.mkdn',
  'README.rst',
  'README.txt',
  'README',
] as const;

export type GitReadme = GitBlobContent;

const getReadmePriority = (name: string): number => {
  const normalized = name.toLowerCase();

  return README_NAMES.findIndex((candidate) => candidate.toLowerCase() === normalized);
};

export const getGitRepositoryReadme = async (
  username: string,
  repositoryName: string,
  requestedRef?: string,
): Promise<GitReadme> => {
  const tree = await getGitRepositoryTree(username, repositoryName, requestedRef, '');

  const candidates = tree.entries
    .filter((entry) => {
      if (entry.kind !== 'file') {
        return false;
      }

      return getReadmePriority(entry.name) !== -1;
    })
    .sort((left, right) => getReadmePriority(left.name) - getReadmePriority(right.name));

  const readme = candidates[0];

  if (!readme) {
    throw new AppError('Repository README not found', 404, 'GIT_README_NOT_FOUND');
  }

  const blob = await getGitBlobContentBySha(username, repositoryName, readme.oid);

  return {
    path: readme.name,
    ref: tree.ref.name,
    ...blob,
  };
};
