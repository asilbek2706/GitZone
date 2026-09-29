import { AppError } from '../../errors/app.error.js';
import { GitReadError } from '../../errors/git-read.error.js';
import {
  assertSafeGitTreePath,
} from '../../utils/git/tree-path.js';
import {
  executeGitReadCommand,
} from './git-read-command.service.js';
import {
  getGitRepositoryRefs,
  type GitReference,
} from './git-ref.service.js';

export type GitTreeEntryKind =
  | 'directory'
  | 'file'
  | 'symlink'
  | 'submodule';

export type GitTreeEntry = {
  name: string;
  path: string;
  mode: string;
  objectType:
    | 'blob'
    | 'tree'
    | 'commit';
  oid: string;
  size: number | null;
  kind: GitTreeEntryKind;
};

export type GitRepositoryTree = {
  objectFormat: 'sha1' | 'sha256';

  ref: {
    name: string;
    fullName: string;
    oid: string | null;
  };

  path: string;

  entries: GitTreeEntry[];
};

const invalidTreeData =
  (): AppError =>
    new AppError(
      'Git repository contains invalid tree data',
      500,
      'GIT_TREE_DATA_INVALID',
    );

const getEntryKind = (
  mode: string,
  objectType: string,
): GitTreeEntryKind => {
  if (
    mode === '040000' &&
    objectType === 'tree'
  ) {
    return 'directory';
  }

  if (
    mode === '160000' &&
    objectType === 'commit'
  ) {
    return 'submodule';
  }

  if (
    mode === '120000' &&
    objectType === 'blob'
  ) {
    return 'symlink';
  }

  if (
    (
      mode === '100644' ||
      mode === '100755'
    ) &&
    objectType === 'blob'
  ) {
    return 'file';
  }

  throw invalidTreeData();
};

const parseTreeEntry = (
  record: string,
  parentPath: string,
  oidLength: 40 | 64,
): GitTreeEntry => {
  const separatorIndex =
    record.indexOf('\t');

  if (separatorIndex <= 0) {
    throw invalidTreeData();
  }

  const header =
    record.slice(
      0,
      separatorIndex,
    );

  const name =
    record.slice(
      separatorIndex + 1,
    );

  if (
    name.length === 0 ||
    name.includes('\0') ||
    name.includes('/')
  ) {
    throw invalidTreeData();
  }

  const match =
    /^([0-7]{6}) (blob|tree|commit) ([0-9a-fA-F]+) +(-|\d+)$/.exec(
      header,
    );

  if (!match) {
    throw invalidTreeData();
  }

  const [
    ,
    mode,
    objectType,
    oid,
    sizeValue,
  ] = match;

  if (
    mode === undefined ||
    objectType === undefined ||
    oid === undefined ||
    sizeValue === undefined ||
    oid.length !== oidLength
  ) {
    throw invalidTreeData();
  }

  if (
    objectType !== 'blob' &&
    objectType !== 'tree' &&
    objectType !== 'commit'
  ) {
    throw invalidTreeData();
  }

  const kind =
    getEntryKind(
      mode,
      objectType,
    );

  let size: number | null =
    null;

  if (sizeValue !== '-') {
    size =
      Number(sizeValue);

    if (
      !Number.isSafeInteger(size) ||
      size < 0
    ) {
      throw invalidTreeData();
    }
  }

  if (
    (
      kind === 'directory' ||
      kind === 'submodule'
    ) &&
    size !== null
  ) {
    throw invalidTreeData();
  }

  if (
    (
      kind === 'file' ||
      kind === 'symlink'
    ) &&
    size === null
  ) {
    throw invalidTreeData();
  }

  const fullPath =
    parentPath === ''
      ? name
      : `${parentPath}/${name}`;

  return {
    name,
    path: fullPath,
    mode,
    objectType,
    oid,
    size,
    kind,
  };
};

const sortEntries = (
  entries: GitTreeEntry[],
): GitTreeEntry[] => {
  const order: Record<
    GitTreeEntryKind,
    number
  > = {
    directory: 0,
    submodule: 1,
    symlink: 2,
    file: 3,
  };

  return [...entries].sort(
    (left, right) => {
      const rankDifference =
        order[left.kind] -
        order[right.kind];

      if (rankDifference !== 0) {
        return rankDifference;
      }

      if (left.name < right.name) {
        return -1;
      }

      if (left.name > right.name) {
        return 1;
      }

      return 0;
    },
  );
};

const findRequestedReference = (
  branches: GitReference[],
  tags: GitReference[],
  requestedRef: string,
): GitReference | null => {
  return (
    branches.find(
      (reference) =>
        reference.name === requestedRef,
    ) ??
    tags.find(
      (reference) =>
        reference.name === requestedRef,
    ) ??
    null
  );
};

export const getGitRepositoryTree =
  async (
    username: string,
    repositoryName: string,
    requestedRef: string | undefined,
    path: string,
  ): Promise<GitRepositoryTree> => {
    assertSafeGitTreePath(path);

    try {
      const refs =
        await getGitRepositoryRefs(
          username,
          repositoryName,
        );

      let selectedReference:
        GitReference | null;

      if (requestedRef === undefined) {
        selectedReference =
          refs.head;

        if (
          selectedReference === null &&
          refs.branches.length > 0
        ) {
          throw new AppError(
            'Git repository HEAD does not resolve to a branch',
            500,
            'GIT_TREE_HEAD_INVALID',
          );
        }
      } else {
        selectedReference =
          findRequestedReference(
            refs.branches,
            refs.tags,
            requestedRef,
          );
      }

      if (selectedReference === null) {
        const isEmptyDefaultBranch =
          refs.branches.length === 0 &&
          (
            requestedRef === undefined ||
            requestedRef ===
              refs.defaultBranch
          );

        if (isEmptyDefaultBranch) {
          if (path !== '') {
            throw new AppError(
              'Git tree path not found',
              404,
              'GIT_TREE_PATH_NOT_FOUND',
            );
          }

          return {
            objectFormat:
              refs.objectFormat,

            ref: {
              name:
                refs.defaultBranch,

              fullName:
                refs.symbolicHead,

              oid: null,
            },

            path: '',

            entries: [],
          };
        }

        throw new AppError(
          'Git reference not found',
          404,
          'GIT_REF_NOT_FOUND',
        );
      }

      const treeish =
        path === ''
          ? selectedReference.fullName
          : `${selectedReference.fullName}:${path}`;

      const result =
        await executeGitReadCommand({
          username,
          repositoryName,

          args: [
            'ls-tree',
            '-z',
            '--long',
            treeish,
          ],
        });

      const oidLength =
        refs.objectFormat ===
        'sha1'
          ? 40
          : 64;

      const entries =
        result.stdout
          .split('\0')
          .filter(
            (record) =>
              record.length > 0,
          )
          .map((record) =>
            parseTreeEntry(
              record,
              path,
              oidLength,
            ),
          );

      return {
        objectFormat:
          refs.objectFormat,

        ref: {
          name:
            selectedReference.name,

          fullName:
            selectedReference.fullName,

          oid:
            selectedReference.oid,
        },

        path,

        entries:
          sortEntries(entries),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (
        error instanceof GitReadError &&
        error.code ===
          'GIT_READ_COMMAND_FAILED' &&
        error.exitCode === 128 &&
        path !== ''
      ) {
        throw new AppError(
          'Git tree path not found',
          404,
          'GIT_TREE_PATH_NOT_FOUND',
        );
      }

      if (
        error instanceof GitReadError
      ) {
        throw new AppError(
          'Failed to read Git repository tree',
          500,
          'GIT_TREE_READ_FAILED',
        );
      }

      throw error;
    }
  };
