import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import { executeGitReadCommand } from './git-read-command.service.js';
import { inspectGitRepository } from './git-repository-inspection.service.js';

export type GitReferenceObjectType = 'commit' | 'tag' | 'tree' | 'blob';

export type GitReference = {
  name: string;
  fullName: string;
  oid: string;
  objectType: GitReferenceObjectType;
};

export type GitRepositoryRefs = {
  objectFormat: 'sha1' | 'sha256';
  symbolicHead: string;
  defaultBranch: string;
  head: GitReference | null;
  branches: GitReference[];
  tags: GitReference[];
};

const HEADS_PREFIX = 'refs/heads/';

const TAGS_PREFIX = 'refs/tags/';

const OBJECT_TYPES = new Set<GitReferenceObjectType>(['commit', 'tag', 'tree', 'blob']);

const invalidReferenceData = (): AppError =>
  new AppError('Git repository contains invalid reference data', 500, 'GIT_REFERENCE_DATA_INVALID');

const isGitReferenceObjectType = (value: string): value is GitReferenceObjectType =>
  OBJECT_TYPES.has(value as GitReferenceObjectType);

const parseSymbolicHead = (
  stdout: string,
): {
  symbolicHead: string;
  defaultBranch: string;
} => {
  const symbolicHead = stdout.trim();

  if (!symbolicHead.startsWith(HEADS_PREFIX)) {
    throw invalidReferenceData();
  }

  const defaultBranch = symbolicHead.slice(HEADS_PREFIX.length);

  if (defaultBranch.length === 0) {
    throw invalidReferenceData();
  }

  return {
    symbolicHead,
    defaultBranch,
  };
};

const parseReference = (line: string, oidLength: 40 | 64): GitReference => {
  const parts = line.split('\t');

  if (parts.length !== 3) {
    throw invalidReferenceData();
  }

  const [fullName, oid, objectType] = parts;

  if (fullName === undefined || oid === undefined || objectType === undefined) {
    throw invalidReferenceData();
  }

  const oidPattern = oidLength === 40 ? /^[0-9a-f]{40}$/i : /^[0-9a-f]{64}$/i;

  if (!oidPattern.test(oid)) {
    throw invalidReferenceData();
  }

  if (!isGitReferenceObjectType(objectType)) {
    throw invalidReferenceData();
  }

  let name: string;

  if (fullName.startsWith(HEADS_PREFIX)) {
    name = fullName.slice(HEADS_PREFIX.length);
  } else if (fullName.startsWith(TAGS_PREFIX)) {
    name = fullName.slice(TAGS_PREFIX.length);
  } else {
    throw invalidReferenceData();
  }

  if (name.length === 0) {
    throw invalidReferenceData();
  }

  return {
    name,
    fullName,
    oid,
    objectType,
  };
};

export const getGitRepositoryRefs = async (
  username: string,
  repositoryName: string,
): Promise<GitRepositoryRefs> => {
  try {
    const inspection = await inspectGitRepository(username, repositoryName);

    const [headResult, refsResult] = await Promise.all([
      executeGitReadCommand({
        username,
        repositoryName,

        args: ['symbolic-ref', '--quiet', 'HEAD'],
      }),

      executeGitReadCommand({
        username,
        repositoryName,

        args: [
          'for-each-ref',
          '--format=%(refname)%09%(objectname)%09%(objecttype)',
          'refs/heads',
          'refs/tags',
        ],
      }),
    ]);

    const { symbolicHead, defaultBranch } = parseSymbolicHead(headResult.stdout);

    const oidLength = inspection.objectFormat === 'sha1' ? 40 : 64;

    const references = refsResult.stdout
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => parseReference(line, oidLength));

    const branches = references.filter((reference) => reference.fullName.startsWith(HEADS_PREFIX));

    const tags = references.filter((reference) => reference.fullName.startsWith(TAGS_PREFIX));

    const head = branches.find((reference) => reference.fullName === symbolicHead) ?? null;

    return {
      objectFormat: inspection.objectFormat,

      symbolicHead,
      defaultBranch,
      head,
      branches,
      tags,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof GitReadError) {
      throw new AppError(
        'Failed to read Git repository references',
        500,
        'GIT_REFERENCE_READ_FAILED',
      );
    }

    throw error;
  }
};
