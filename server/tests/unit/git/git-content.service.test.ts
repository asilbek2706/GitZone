import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const {
  mockedGetRefs,
  mockedExecute,
} = vi.hoisted(() => ({
  mockedGetRefs: vi.fn(),
  mockedExecute: vi.fn(),
}));

vi.mock(
  '../../../src/services/git/git-ref.service.js',
  () => ({
    getGitRepositoryRefs: mockedGetRefs,
  }),
);

vi.mock(
  '../../../src/services/git/git-read-command.service.js',
  () => ({
    executeGitReadCommand: mockedExecute,
  }),
);

const {
  getGitBlobContent,
  getGitBlobContentBySha,
} = await import(
  '../../../src/services/git/git-content.service.js'
);

const OID =
  '1111111111111111111111111111111111111111';

const refsResult = {
  objectFormat: 'sha1' as const,
  symbolicHead: 'refs/heads/main',
  defaultBranch: 'main',

  head: {
    name: 'main',
    fullName: 'refs/heads/main',
    oid: OID,
    objectType: 'commit' as const,
  },

  branches: [
    {
      name: 'main',
      fullName: 'refs/heads/main',
      oid: OID,
      objectType: 'commit' as const,
    },
  ],

  tags: [],
};

describe(
  'Git content service',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedGetRefs.mockResolvedValue(
        refsResult,
      );
    });

    it('reads a text blob by repository path', async () => {
      mockedExecute
        .mockResolvedValueOnce({
          stdout: `${OID}\n`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'blob\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '12\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'hello world\n',
          stderr: '',
        });

      const result =
        await getGitBlobContent(
          'asil',
          'demo',
          undefined,
          'README.md',
        );

      expect(result).toEqual({
        path: 'README.md',
        ref: 'main',
        oid: OID,
        size: 12,
        encoding: 'utf-8',
        content: 'hello world\n',
      });

      expect(mockedExecute)
        .toHaveBeenCalledTimes(4);
    });

    it('allows a blob exactly at the maximum file size', async () => {
      mockedExecute
        .mockResolvedValueOnce({
          stdout: `${OID}\n`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'blob\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '1048576\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'allowed',
          stderr: '',
        });

      const result =
        await getGitBlobContent(
          'asil',
          'demo',
          undefined,
          'large.txt',
        );

      expect(result.size)
        .toBe(1048576);

      expect(mockedExecute)
        .toHaveBeenCalledTimes(4);
    });

    it('rejects an oversized path blob before reading its content', async () => {
      mockedExecute
        .mockResolvedValueOnce({
          stdout: `${OID}\n`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'blob\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '1048577\n',
          stderr: '',
        });

      await expect(
        getGitBlobContent(
          'asil',
          'demo',
          undefined,
          'huge.bin',
        ),
      ).rejects.toMatchObject({
        statusCode: 413,
        code: 'GIT_FILE_TOO_LARGE',
      });

      expect(mockedExecute)
        .toHaveBeenCalledTimes(3);

      expect(mockedExecute)
        .not.toHaveBeenCalledWith({
          username: 'asil',
          repositoryName: 'demo',
          args: [
            'cat-file',
            'blob',
            OID,
          ],
        });
    });

    it('rejects an oversized SHA blob before reading its content', async () => {
      mockedExecute
        .mockResolvedValueOnce({
          stdout: 'blob\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '1048577\n',
          stderr: '',
        });

      await expect(
        getGitBlobContentBySha(
          'asil',
          'demo',
          OID,
        ),
      ).rejects.toMatchObject({
        statusCode: 413,
        code: 'GIT_FILE_TOO_LARGE',
      });

      expect(mockedExecute)
        .toHaveBeenCalledTimes(2);

      expect(mockedExecute)
        .not.toHaveBeenCalledWith({
          username: 'asil',
          repositoryName: 'demo',
          args: [
            'cat-file',
            'blob',
            OID,
          ],
        });
    });

    it('rejects an invalid blob SHA before executing Git', async () => {
      await expect(
        getGitBlobContentBySha(
          'asil',
          'demo',
          '../bad',
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_GIT_BLOB_SHA',
      });

      expect(mockedExecute)
        .not.toHaveBeenCalled();
    });
  },
);
