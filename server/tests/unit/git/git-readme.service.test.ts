import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGetTree, mockedGetBlobContentBySha } = vi.hoisted(() => ({
  mockedGetTree: vi.fn(),
  mockedGetBlobContentBySha: vi.fn(),
}));

vi.mock('../../../src/services/git/git-tree.service.js', () => ({
  getGitRepositoryTree: mockedGetTree,
}));

vi.mock('../../../src/services/git/git-content.service.js', () => ({
  getGitBlobContentBySha: mockedGetBlobContentBySha,
}));

const { getGitRepositoryReadme } = await import('../../../src/services/git/git-readme.service.js');

const MAIN_REF = {
  name: 'main',
  fullName: 'refs/heads/main',
  oid: '1111111111111111111111111111111111111111',
};

const createTree = (
  entries: Array<{
    name: string;
    kind: 'file' | 'directory';
  }>,
) => ({
  objectFormat: 'sha1' as const,
  path: '',
  ref: MAIN_REF,
  entries: entries.map((entry, index) => ({
    name: entry.name,
    path: entry.name,
    mode: entry.kind === 'directory' ? '040000' : '100644',
    objectType: entry.kind === 'directory' ? ('tree' as const) : ('blob' as const),
    kind: entry.kind,
    oid: String(index + 1)
      .padStart(40, '1')
      .slice(0, 40),
    size: entry.kind === 'file' ? 12 : null,
  })),
});

describe('git-readme.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetBlobContentBySha.mockResolvedValue({
      oid: '2222222222222222222222222222222222222222',
      size: 12,
      encoding: 'utf-8',
      content: '# GitZone\n',
    });
  });

  it('detects README.md in repository root', async () => {
    const tree = createTree([
      {
        name: 'src',
        kind: 'directory',
      },
      {
        name: 'README.md',
        kind: 'file',
      },
    ]);

    mockedGetTree.mockResolvedValue(tree);

    const result = await getGitRepositoryReadme('asil', 'demo');

    expect(result).toEqual({
      path: 'README.md',
      ref: 'main',
      oid: '2222222222222222222222222222222222222222',
      size: 12,
      encoding: 'utf-8',
      content: '# GitZone\n',
    });

    expect(mockedGetTree).toHaveBeenCalledWith('asil', 'demo', undefined, '');

    expect(mockedGetBlobContentBySha).toHaveBeenCalledWith('asil', 'demo', tree.entries[1]!.oid);
  });

  it('detects README names case-insensitively', async () => {
    const tree = createTree([
      {
        name: 'readme.MD',
        kind: 'file',
      },
    ]);

    mockedGetTree.mockResolvedValue(tree);

    const result = await getGitRepositoryReadme('asil', 'demo');

    expect(result.path).toBe('readme.MD');

    expect(mockedGetBlobContentBySha).toHaveBeenCalledWith('asil', 'demo', tree.entries[0]!.oid);
  });

  it('prefers README.md over lower-priority README variants', async () => {
    const tree = createTree([
      {
        name: 'README.txt',
        kind: 'file',
      },
      {
        name: 'README',
        kind: 'file',
      },
      {
        name: 'README.md',
        kind: 'file',
      },
    ]);

    mockedGetTree.mockResolvedValue(tree);

    const result = await getGitRepositoryReadme('asil', 'demo');

    expect(result.path).toBe('README.md');

    expect(mockedGetBlobContentBySha).toHaveBeenCalledWith('asil', 'demo', tree.entries[2]!.oid);
  });

  it('preserves the resolved tree ref in the README response', async () => {
    const tree = {
      ...createTree([
        {
          name: 'README.md',
          kind: 'file',
        },
      ]),
      ref: {
        name: 'develop',
        fullName: 'refs/heads/develop',
        oid: '3333333333333333333333333333333333333333',
      },
    };

    mockedGetTree.mockResolvedValue(tree);

    const result = await getGitRepositoryReadme('asil', 'demo', 'develop');

    expect(result.ref).toBe('develop');

    expect(mockedGetTree).toHaveBeenCalledWith('asil', 'demo', 'develop', '');

    expect(mockedGetBlobContentBySha).toHaveBeenCalledWith('asil', 'demo', tree.entries[0]!.oid);
  });

  it('returns 404 when repository has no README', async () => {
    mockedGetTree.mockResolvedValue(
      createTree([
        {
          name: 'package.json',
          kind: 'file',
        },
        {
          name: 'src',
          kind: 'directory',
        },
      ]),
    );

    await expect(getGitRepositoryReadme('asil', 'demo')).rejects.toMatchObject({
      statusCode: 404,
      code: 'GIT_README_NOT_FOUND',
    });

    expect(mockedGetBlobContentBySha).not.toHaveBeenCalled();
  });

  it('does not treat a directory named README.md as a README file', async () => {
    mockedGetTree.mockResolvedValue(
      createTree([
        {
          name: 'README.md',
          kind: 'directory',
        },
      ]),
    );

    await expect(getGitRepositoryReadme('asil', 'demo')).rejects.toMatchObject({
      statusCode: 404,
      code: 'GIT_README_NOT_FOUND',
    });

    expect(mockedGetBlobContentBySha).not.toHaveBeenCalled();
  });
});
