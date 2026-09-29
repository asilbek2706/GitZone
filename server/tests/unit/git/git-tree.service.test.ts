import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  GitReadError,
} from '../../../src/errors/git-read.error.js';

const {
  mockedGetRefs,
  mockedExecute,
} = vi.hoisted(() => ({
  mockedGetRefs:
    vi.fn(),

  mockedExecute:
    vi.fn(),
}));

vi.mock(
  '../../../src/services/git/git-ref.service.js',
  () => ({
    getGitRepositoryRefs:
      mockedGetRefs,
  }),
);

vi.mock(
  '../../../src/services/git/git-read-command.service.js',
  () => ({
    executeGitReadCommand:
      mockedExecute,
  }),
);

const {
  getGitRepositoryTree,
} = await import(
  '../../../src/services/git/git-tree.service.js'
);

const MAIN_OID =
  '1111111111111111111111111111111111111111';

const DEV_OID =
  '2222222222222222222222222222222222222222';

const TREE_OID =
  '3333333333333333333333333333333333333333';

const FILE_OID =
  '4444444444444444444444444444444444444444';

const LINK_OID =
  '5555555555555555555555555555555555555555';

const SUBMODULE_OID =
  '6666666666666666666666666666666666666666';

const TAG_OID =
  '7777777777777777777777777777777777777777';

const refsResult = {
  objectFormat: 'sha1' as const,

  symbolicHead:
    'refs/heads/main',

  defaultBranch:
    'main',

  head: {
    name: 'main',
    fullName:
      'refs/heads/main',
    oid: MAIN_OID,
    objectType:
      'commit' as const,
  },

  branches: [
    {
      name: 'main',
      fullName:
        'refs/heads/main',
      oid: MAIN_OID,
      objectType:
        'commit' as const,
    },

    {
      name: 'dev',
      fullName:
        'refs/heads/dev',
      oid: DEV_OID,
      objectType:
        'commit' as const,
    },
  ],

  tags: [
    {
      name: 'v1.0.0',
      fullName:
        'refs/tags/v1.0.0',
      oid: TAG_OID,
      objectType:
        'tag' as const,
    },
  ],
};

describe(
  'Git tree service',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedGetRefs
        .mockResolvedValue(
          refsResult,
        );
    });

    it('lists root tree entries', async () => {
      mockedExecute
        .mockResolvedValue({
          stdout: [
            `100644 blob ${FILE_OID} 12\tREADME.md`,
            `040000 tree ${TREE_OID} -\tsrc`,
            `120000 blob ${LINK_OID} 8\tcurrent`,
            `160000 commit ${SUBMODULE_OID} -\tvendor`,
            '',
          ].join('\0'),

          stderr: '',
        });

      const result =
        await getGitRepositoryTree(
          'asil',
          'demo',
          undefined,
          '',
        );

      expect(result.ref.name)
        .toBe('main');

      expect(
        result.entries.map(
          (entry) =>
            entry.kind,
        ),
      ).toEqual([
        'directory',
        'submodule',
        'symlink',
        'file',
      ]);

      expect(
        result.entries.map(
          (entry) =>
            entry.name,
        ),
      ).toEqual([
        'src',
        'vendor',
        'current',
        'README.md',
      ]);

      expect(mockedExecute)
        .toHaveBeenCalledWith({
          username: 'asil',
          repositoryName:
            'demo',

          args: [
            'ls-tree',
            '-z',
            '--long',
            'refs/heads/main',
          ],
        });
    });

    it('lists a nested directory', async () => {
      mockedExecute
        .mockResolvedValue({
          stdout:
            `100644 blob ${FILE_OID} 50\tgit-tree.service.ts\0`,

          stderr: '',
        });

      const result =
        await getGitRepositoryTree(
          'asil',
          'demo',
          'main',
          'src/services',
        );

      expect(
        result.entries[0]?.path,
      ).toBe(
        'src/services/git-tree.service.ts',
      );

      expect(mockedExecute)
        .toHaveBeenCalledWith({
          username: 'asil',
          repositoryName:
            'demo',

          args: [
            'ls-tree',
            '-z',
            '--long',
            'refs/heads/main:src/services',
          ],
        });
    });

    it('allows browsing an existing tag', async () => {
      mockedExecute
        .mockResolvedValue({
          stdout: '',
          stderr: '',
        });

      const result =
        await getGitRepositoryTree(
          'asil',
          'demo',
          'v1.0.0',
          '',
        );

      expect(result.ref)
        .toEqual({
          name: 'v1.0.0',
          fullName:
            'refs/tags/v1.0.0',
          oid: TAG_OID,
        });
    });

    it('returns an empty root for an empty repository', async () => {
      mockedGetRefs
        .mockResolvedValue({
          objectFormat:
            'sha1',

          symbolicHead:
            'refs/heads/main',

          defaultBranch:
            'main',

          head: null,
          branches: [],
          tags: [],
        });

      const result =
        await getGitRepositoryTree(
          'asil',
          'empty',
          undefined,
          '',
        );

      expect(result.entries)
        .toEqual([]);

      expect(result.ref)
        .toEqual({
          name: 'main',
          fullName:
            'refs/heads/main',
          oid: null,
        });

      expect(mockedExecute)
        .not.toHaveBeenCalled();
    });

    it('rejects missing ref', async () => {
      await expect(
        getGitRepositoryTree(
          'asil',
          'demo',
          'missing',
          '',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code:
          'GIT_REF_NOT_FOUND',
      });

      expect(mockedExecute)
        .not.toHaveBeenCalled();
    });

    it('rejects nested path in an empty repository', async () => {
      mockedGetRefs
        .mockResolvedValue({
          objectFormat:
            'sha1',
          symbolicHead:
            'refs/heads/main',
          defaultBranch:
            'main',
          head: null,
          branches: [],
          tags: [],
        });

      await expect(
        getGitRepositoryTree(
          'asil',
          'empty',
          undefined,
          'src',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code:
          'GIT_TREE_PATH_NOT_FOUND',
      });
    });

    it('rejects unsafe tree path before reading Git', async () => {
      await expect(
        getGitRepositoryTree(
          'asil',
          'demo',
          undefined,
          '../secret',
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code:
          'INVALID_GIT_TREE_PATH',
      });

      expect(mockedGetRefs)
        .not.toHaveBeenCalled();

      expect(mockedExecute)
        .not.toHaveBeenCalled();
    });

    it('rejects malformed tree data', async () => {
      mockedExecute
        .mockResolvedValue({
          stdout:
            'invalid-tree-record\0',
          stderr: '',
        });

      await expect(
        getGitRepositoryTree(
          'asil',
          'demo',
          undefined,
          '',
        ),
      ).rejects.toMatchObject({
        statusCode: 500,
        code:
          'GIT_TREE_DATA_INVALID',
      });
    });

    it('maps missing nested path to 404', async () => {
      mockedExecute
        .mockRejectedValue(
          new GitReadError(
            'bad tree path',
            'GIT_READ_COMMAND_FAILED',
            {
              exitCode: 128,
            },
          ),
        );

      await expect(
        getGitRepositoryTree(
          'asil',
          'demo',
          undefined,
          'missing',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code:
          'GIT_TREE_PATH_NOT_FOUND',
      });
    });

    it('maps Git infrastructure failures safely', async () => {
      mockedExecute
        .mockRejectedValue(
          new GitReadError(
            'timeout',
            'GIT_READ_TIMEOUT',
          ),
        );

      await expect(
        getGitRepositoryTree(
          'asil',
          'demo',
          undefined,
          '',
        ),
      ).rejects.toMatchObject({
        statusCode: 500,
        code:
          'GIT_TREE_READ_FAILED',
      });
    });
  },
);
