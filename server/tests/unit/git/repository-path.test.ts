import path from 'node:path';

import { describe, expect, it } from 'vitest';

process.env.GIT_STORAGE_PATH = './storage/test-repositories';

const { resolveGitRepositoryPath } =
  await import('../../../src/utils/git/repository-path.js');

const storageRoot = path.resolve(
  process.cwd(),
  process.env.GIT_STORAGE_PATH,
);

describe('Git repository path resolver', () => {
  it('resolves a repository inside the configured Git storage root', () => {
    const result = resolveGitRepositoryPath('asil', 'demo');

    expect(result).toBe(
      path.join(storageRoot, 'asil', 'demo.git'),
    );
  });

  it.each([
    '../asil',
    '..',
    '.',
    '/tmp',
    'asil/user',
    'asil\\user',
    '',
  ])('rejects unsafe username "%s"', (username) => {
    expect(() =>
      resolveGitRepositoryPath(username, 'demo'),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_GIT_REPOSITORY_PATH',
      }),
    );
  });

  it.each([
    '../demo',
    '..',
    '.',
    '/tmp/demo',
    'folder/demo',
    'folder\\demo',
    '',
  ])('rejects unsafe repository name "%s"', (repositoryName) => {
    expect(() =>
      resolveGitRepositoryPath('asil', repositoryName),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_GIT_REPOSITORY_PATH',
      }),
    );
  });

  it('does not allow traversal into a sibling storage directory', () => {
    expect(() =>
      resolveGitRepositoryPath('..', 'outside'),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_GIT_REPOSITORY_PATH',
      }),
    );
  });

  it('allows safe repository naming characters', () => {
    const result = resolveGitRepositoryPath(
      'asilbek-2706',
      'project_v2.1',
    );

    expect(result).toBe(
      path.join(
        storageRoot,
        'asilbek-2706',
        'project_v2.1.git',
      ),
    );
  });
});
