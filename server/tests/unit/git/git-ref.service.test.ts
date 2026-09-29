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
  mockedExecuteGitReadCommand,
  mockedInspectGitRepository,
} = vi.hoisted(() => ({
  mockedExecuteGitReadCommand:
    vi.fn(),

  mockedInspectGitRepository:
    vi.fn(),
}));

vi.mock(
  '../../../src/services/git/git-read-command.service.js',
  () => ({
    executeGitReadCommand:
      mockedExecuteGitReadCommand,
  }),
);

vi.mock(
  '../../../src/services/git/git-repository-inspection.service.js',
  () => ({
    inspectGitRepository:
      mockedInspectGitRepository,
  }),
);

const {
  getGitRepositoryRefs,
} = await import(
  '../../../src/services/git/git-ref.service.js'
);

const SHA1_MAIN =
  '1111111111111111111111111111111111111111';

const SHA1_DEV =
  '2222222222222222222222222222222222222222';

const SHA1_TAG =
  '3333333333333333333333333333333333333333';

describe(
  'Git ref service',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedInspectGitRepository
        .mockResolvedValue({
          isBare: true,
          objectFormat: 'sha1',
        });
    });

    it('reads HEAD, branches and tags', async () => {
      mockedExecuteGitReadCommand
        .mockResolvedValueOnce({
          stdout:
            'refs/heads/main\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: [
            `refs/heads/dev\t${SHA1_DEV}\tcommit`,
            `refs/heads/main\t${SHA1_MAIN}\tcommit`,
            `refs/tags/v1.0.0\t${SHA1_TAG}\ttag`,
            '',
          ].join('\n'),
          stderr: '',
        });

      const result =
        await getGitRepositoryRefs(
          'asil',
          'demo',
        );

      expect(result)
        .toMatchObject({
          objectFormat: 'sha1',
          symbolicHead:
            'refs/heads/main',
          defaultBranch:
            'main',

          head: {
            name: 'main',
            oid: SHA1_MAIN,
            objectType:
              'commit',
          },
        });

      expect(result.branches)
        .toHaveLength(2);

      expect(result.tags)
        .toHaveLength(1);
    });

    it('supports an empty repository', async () => {
      mockedExecuteGitReadCommand
        .mockResolvedValueOnce({
          stdout:
            'refs/heads/main\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        });

      const result =
        await getGitRepositoryRefs(
          'asil',
          'empty',
        );

      expect(result.defaultBranch)
        .toBe('main');

      expect(result.head)
        .toBeNull();

      expect(result.branches)
        .toEqual([]);

      expect(result.tags)
        .toEqual([]);
    });

    it('supports SHA-256 object ids', async () => {
      mockedInspectGitRepository
        .mockResolvedValue({
          isBare: true,
          objectFormat: 'sha256',
        });

      const oid =
        'a'.repeat(64);

      mockedExecuteGitReadCommand
        .mockResolvedValueOnce({
          stdout:
            'refs/heads/main\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout:
            `refs/heads/main\t${oid}\tcommit\n`,
          stderr: '',
        });

      const result =
        await getGitRepositoryRefs(
          'asil',
          'demo',
        );

      expect(
        result.head?.oid,
      ).toBe(oid);

      expect(result.objectFormat)
        .toBe('sha256');
    });

    it('rejects invalid symbolic HEAD', async () => {
      mockedExecuteGitReadCommand
        .mockResolvedValueOnce({
          stdout:
            'refs/tags/v1\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        });

      await expect(
        getGitRepositoryRefs(
          'asil',
          'demo',
        ),
      ).rejects.toMatchObject({
        statusCode: 500,
        code:
          'GIT_REFERENCE_DATA_INVALID',
      });
    });

    it('rejects malformed object id', async () => {
      mockedExecuteGitReadCommand
        .mockResolvedValueOnce({
          stdout:
            'refs/heads/main\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout:
            'refs/heads/main\tbad-oid\tcommit\n',
          stderr: '',
        });

      await expect(
        getGitRepositoryRefs(
          'asil',
          'demo',
        ),
      ).rejects.toMatchObject({
        statusCode: 500,
        code:
          'GIT_REFERENCE_DATA_INVALID',
      });
    });

    it('maps Git command failures to safe application error', async () => {
      mockedExecuteGitReadCommand
        .mockRejectedValue(
          new GitReadError(
            'internal git failure',
            'GIT_READ_COMMAND_FAILED',
            {
              exitCode: 128,
              stderr:
                'internal details',
            },
          ),
        );

      await expect(
        getGitRepositoryRefs(
          'asil',
          'demo',
        ),
      ).rejects.toMatchObject({
        statusCode: 500,
        code:
          'GIT_REFERENCE_READ_FAILED',
      });
    });
  },
);
