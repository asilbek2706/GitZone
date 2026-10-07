import { AppError } from '../../errors/app.error.js';

import { getGitRepositoryRefs } from '../git/git-ref.service.js';
import { getPullRequestDiff } from './pull-request-git.service.js';

export type PullRequestDiffAnchor = {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  baseSha: string;
  headSha: string;
};

type DiffLine = {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
};

const normalizeDiffPath = (value: string): string => value.replace(/^(a|b)\//, '');

const parseUnifiedDiffLines = (diff: string): DiffLine[] => {
  const result: DiffLine[] = [];

  let currentPath: string | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const rawLine of diff.split(/\r?\n/)) {
    if (rawLine.startsWith('+++ ')) {
      const value = rawLine.slice(4).trim();

      currentPath = value === '/dev/null' ? currentPath : normalizeDiffPath(value);

      continue;
    }

    if (rawLine.startsWith('--- ')) {
      const value = rawLine.slice(4).trim();

      if (value !== '/dev/null') {
        currentPath = normalizeDiffPath(value);
      }

      continue;
    }

    const hunk = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }

    if (!currentPath) {
      continue;
    }

    if (rawLine.startsWith('\\ No newline at end of file')) {
      continue;
    }

    if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
      result.push({
        path: currentPath,
        line: oldLine,
        side: 'LEFT',
      });

      oldLine += 1;
      continue;
    }

    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      result.push({
        path: currentPath,
        line: newLine,
        side: 'RIGHT',
      });

      newLine += 1;
      continue;
    }

    if (rawLine.startsWith(' ')) {
      result.push({
        path: currentPath,
        line: oldLine,
        side: 'LEFT',
      });

      result.push({
        path: currentPath,
        line: newLine,
        side: 'RIGHT',
      });

      oldLine += 1;
      newLine += 1;
    }
  }

  return result;
};

const getBranchSnapshots = async (
  username: string,
  repositoryName: string,
  sourceBranch: string,
  targetBranch: string,
) => {
  const refs = await getGitRepositoryRefs(username, repositoryName);

  const source = refs.branches.find((branch) => branch.name === sourceBranch);

  const target = refs.branches.find((branch) => branch.name === targetBranch);

  if (!source) {
    throw new AppError(
      'Pull request source branch not found',
      409,
      'PULL_REQUEST_SOURCE_BRANCH_NOT_FOUND',
    );
  }

  if (!target) {
    throw new AppError(
      'Pull request target branch not found',
      409,
      'PULL_REQUEST_TARGET_BRANCH_NOT_FOUND',
    );
  }

  return {
    headSha: source.oid,
    baseSha: target.oid,
  };
};

export const validatePullRequestDiffAnchor = async (
  username: string,
  repositoryName: string,
  sourceBranch: string,
  targetBranch: string,
  path: string,
  line: number,
  side: 'LEFT' | 'RIGHT',
): Promise<PullRequestDiffAnchor> => {
  const snapshots = await getBranchSnapshots(username, repositoryName, sourceBranch, targetBranch);

  const comparison = await getPullRequestDiff(username, repositoryName, sourceBranch, targetBranch);

  if (comparison.diff.binary) {
    throw new AppError(
      'Inline comments are not supported on binary diffs',
      400,
      'PULL_REQUEST_BINARY_DIFF_COMMENT_NOT_SUPPORTED',
    );
  }

  if (comparison.diff.truncated) {
    throw new AppError(
      'Inline comment cannot be validated against a truncated diff',
      409,
      'PULL_REQUEST_DIFF_TRUNCATED',
    );
  }

  const normalizedPath = normalizeDiffPath(path.trim());

  const lines = parseUnifiedDiffLines(comparison.diff.diff);

  const exists = lines.some(
    (entry) => entry.path === normalizedPath && entry.line === line && entry.side === side,
  );

  if (!exists) {
    throw new AppError(
      'Inline comment position does not exist in the pull request diff',
      400,
      'INVALID_PULL_REQUEST_DIFF_POSITION',
    );
  }

  return {
    path: normalizedPath,
    line,
    side,
    baseSha: snapshots.baseSha,
    headSha: snapshots.headSha,
  };
};

export const isPullRequestDiffAnchorOutdated = async (
  username: string,
  repositoryName: string,
  sourceBranch: string,
  targetBranch: string,
  anchor: {
    baseSha: string | null;
    headSha: string | null;
  },
): Promise<boolean> => {
  if (!anchor.baseSha || !anchor.headSha) {
    return false;
  }

  const current = await getBranchSnapshots(username, repositoryName, sourceBranch, targetBranch);

  return current.baseSha !== anchor.baseSha || current.headSha !== anchor.headSha;
};
