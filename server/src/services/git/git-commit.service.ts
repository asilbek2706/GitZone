import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import { executeGitReadCommand } from './git-read-command.service.js';
import { getGitRepositoryRefs, type GitReference } from './git-ref.service.js';
import { assertSafeGitTreePath } from '../../utils/git/tree-path.js';

export type GitCommitSummary = {
  sha: string;
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  message: string;
};

export type GitCommitDetail = GitCommitSummary & { diff: string };
const FIELD_SEPARATOR = '\x1f';
const RECORD_SEPARATOR = '\x1e';

const commitFormat =
  `%H${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ae${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%cn${FIELD_SEPARATOR}%ce${FIELD_SEPARATOR}%cI${FIELD_SEPARATOR}%s`;

const parseCommit = (record: string): GitCommitSummary => {
  const fields = record.split(FIELD_SEPARATOR);
  if (fields.length !== 8 || fields.some((field) => field === undefined)) {
    throw new AppError('Git repository contains invalid commit data', 500, 'GIT_COMMIT_DATA_INVALID');
  }
  const field = (index: number): string => {
    const value = fields[index];
    if (value === undefined) {
      throw new AppError('Git repository contains invalid commit data', 500, 'GIT_COMMIT_DATA_INVALID');
    }
    return value;
  };
  const sha = field(0);
  const authorName = field(1);
  const authorEmail = field(2);
  const authorDate = field(3);
  const committerName = field(4);
  const committerEmail = field(5);
  const committerDate = field(6);
  const message = field(7);
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/i.test(sha)) {
    throw new AppError('Git repository contains invalid commit data', 500, 'GIT_COMMIT_DATA_INVALID');
  }
  return {
    sha,
    author: { name: authorName, email: authorEmail, date: authorDate },
    committer: { name: committerName, email: committerEmail, date: committerDate },
    message,
  };
};

const resolveReference = (refs: Awaited<ReturnType<typeof getGitRepositoryRefs>>, requested: string | undefined): GitReference => {
  const result = requested === undefined ? refs.head : refs.branches.find((ref) => ref.name === requested) ?? refs.tags.find((ref) => ref.name === requested);
  if (!result) throw new AppError('Git reference not found', 404, 'GIT_REF_NOT_FOUND');
  return result;
};

export const listGitCommits = async (
  username: string,
  repositoryName: string,
  requestedRef: string | undefined,
  path: string | undefined,
  page: number,
  perPage: number,
): Promise<GitCommitSummary[]> => {
  if (path !== undefined) assertSafeGitTreePath(path);
  try {
    const refs = await getGitRepositoryRefs(username, repositoryName);
    const ref = resolveReference(refs, requestedRef);
    const args = ['log', `--max-count=${perPage}`, `--skip=${(page - 1) * perPage}`, `--format=${RECORD_SEPARATOR}${commitFormat}`, ref.fullName];
    if (path) args.push('--', path);
    const output = (await executeGitReadCommand({ username, repositoryName, args })).stdout;
    return output.split(RECORD_SEPARATOR).filter(Boolean).map(parseCommit);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to read Git commit history', 500, 'GIT_COMMIT_HISTORY_READ_FAILED');
  }
};

export const getGitCommit = async (
  username: string,
  repositoryName: string,
  sha: string,
): Promise<GitCommitDetail> => {
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/i.test(sha)) {
    throw new AppError('Invalid commit SHA', 400, 'INVALID_GIT_COMMIT_SHA');
  }
  try {
    const metadata = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['show', '-s', `--format=${commitFormat}`, '--end-of-options', sha],
    });
    const commit = parseCommit(metadata.stdout.trim());
    const diff = await executeGitReadCommand({
      username,
      repositoryName,
      args: ['diff-tree', '--root', '--no-commit-id', '--patch', '--no-ext-diff', '--end-of-options', sha],
    });
    return { ...commit, diff: diff.stdout };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof GitReadError && error.code === 'GIT_READ_COMMAND_FAILED' && error.exitCode === 128) {
      throw new AppError('Git commit not found', 404, 'GIT_COMMIT_NOT_FOUND');
    }
    throw new AppError('Failed to read Git commit', 500, 'GIT_COMMIT_READ_FAILED');
  }
};
