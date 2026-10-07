import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGetRefs, mockedExecute, mockedExecuteBuffer } = vi.hoisted(() => ({
  mockedGetRefs: vi.fn(),
  mockedExecute: vi.fn(),
  mockedExecuteBuffer: vi.fn(),
}));

vi.mock('../../../src/services/git/git-ref.service.js', () => ({
  getGitRepositoryRefs: mockedGetRefs,
}));

vi.mock('../../../src/services/git/git-read-command.service.js', () => ({
  executeGitReadCommand: mockedExecute,
  executeGitReadBufferCommand: mockedExecuteBuffer,
}));

const { getGitBlobContent, getGitBlobContentBySha, getGitRawBlob } =
  await import('../../../src/services/git/git-content.service.js');

const OID = '1111111111111111111111111111111111111111';

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

describe('Git content service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetRefs.mockResolvedValue(refsResult);
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
      });

    mockedExecuteBuffer.mockResolvedValueOnce({
      stdout: Buffer.from('hello world\n'),
      stderr: Buffer.alloc(0),
    });

    const result = await getGitBlobContent('asil', 'demo', undefined, 'README.md');

    expect(result).toEqual({
      path: 'README.md',
      ref: 'main',
      oid: OID,
      size: 12,
      encoding: 'utf-8',
      content: 'hello world\n',
    });

    expect(mockedExecute).toHaveBeenCalledTimes(3);

    expect(mockedExecuteBuffer).toHaveBeenCalledOnce();
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
      });

    mockedExecuteBuffer.mockResolvedValueOnce({
      stdout: Buffer.from('allowed'),
      stderr: Buffer.alloc(0),
    });

    const result = await getGitBlobContent('asil', 'demo', undefined, 'large.txt');

    expect(result.size).toBe(1048576);

    expect(mockedExecute).toHaveBeenCalledTimes(3);

    expect(mockedExecuteBuffer).toHaveBeenCalledOnce();
  });

  it('rejects a binary blob read by repository path', async () => {
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
        stdout: '8\n',
        stderr: '',
      });

    mockedExecuteBuffer.mockResolvedValueOnce({
      stdout: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03]),
      stderr: Buffer.alloc(0),
    });

    await expect(getGitBlobContent('asil', 'demo', undefined, 'image.png')).rejects.toMatchObject({
      statusCode: 415,
      code: 'GIT_FILE_BINARY',
    });

    expect(mockedExecute).toHaveBeenCalledTimes(3);

    expect(mockedExecuteBuffer).toHaveBeenCalledOnce();
  });

  it('rejects a binary blob read by SHA', async () => {
    mockedExecute
      .mockResolvedValueOnce({
        stdout: 'blob\n',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: '8\n',
        stderr: '',
      });

    mockedExecuteBuffer.mockResolvedValueOnce({
      stdout: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03]),
      stderr: Buffer.alloc(0),
    });

    await expect(getGitBlobContentBySha('asil', 'demo', OID)).rejects.toMatchObject({
      statusCode: 415,
      code: 'GIT_FILE_BINARY',
    });

    expect(mockedExecute).toHaveBeenCalledTimes(2);

    expect(mockedExecuteBuffer).toHaveBeenCalledOnce();
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

    await expect(getGitBlobContent('asil', 'demo', undefined, 'huge.bin')).rejects.toMatchObject({
      statusCode: 413,
      code: 'GIT_FILE_TOO_LARGE',
    });

    expect(mockedExecute).toHaveBeenCalledTimes(3);

    expect(mockedExecute).not.toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['cat-file', 'blob', OID],
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

    await expect(getGitBlobContentBySha('asil', 'demo', OID)).rejects.toMatchObject({
      statusCode: 413,
      code: 'GIT_FILE_TOO_LARGE',
    });

    expect(mockedExecute).toHaveBeenCalledTimes(2);

    expect(mockedExecuteBuffer).not.toHaveBeenCalled();

    expect(mockedExecute).not.toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['cat-file', 'blob', OID],
    });
  });

  it('rejects an invalid blob SHA before executing Git', async () => {
    await expect(getGitBlobContentBySha('asil', 'demo', '../bad')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_BLOB_SHA',
    });

    expect(mockedExecute).not.toHaveBeenCalled();
  });
  it('returns a raw binary blob without UTF-8 decoding', async () => {
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x01, 0x80]);

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
        stdout: '8\n',
        stderr: '',
      });

    mockedExecuteBuffer.mockResolvedValueOnce({
      stdout: binaryContent,
      stderr: Buffer.alloc(0),
    });

    const result = await getGitRawBlob('asil', 'demo', undefined, 'image.png');

    expect(result).toMatchObject({
      path: 'image.png',
      ref: 'main',
      oid: OID,
      size: 8,
    });

    expect(Buffer.isBuffer(result.content)).toBe(true);

    expect(result.content).toEqual(binaryContent);

    expect(mockedExecuteBuffer).toHaveBeenCalledWith({
      username: 'asil',
      repositoryName: 'demo',
      args: ['cat-file', 'blob', OID],
    });
  });

  it('rejects an oversized raw blob before reading its content', async () => {
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

    await expect(getGitRawBlob('asil', 'demo', undefined, 'huge.bin')).rejects.toMatchObject({
      statusCode: 413,
      code: 'GIT_FILE_TOO_LARGE',
    });

    expect(mockedExecuteBuffer).not.toHaveBeenCalled();
  });

  it('rejects an invalid raw file path before executing Git', async () => {
    await expect(getGitRawBlob('asil', 'demo', undefined, '../secret.txt')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_GIT_TREE_PATH',
    });

    expect(mockedGetRefs).not.toHaveBeenCalled();

    expect(mockedExecute).not.toHaveBeenCalled();

    expect(mockedExecuteBuffer).not.toHaveBeenCalled();
  });
});
