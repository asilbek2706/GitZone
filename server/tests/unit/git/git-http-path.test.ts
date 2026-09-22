import { describe, expect, it } from 'vitest';

process.env.GIT_STORAGE_PATH = './storage/test-repositories';

const { buildGitHttpPathInfo } =
  await import('../../../src/utils/git/http-path.js');

describe('Git HTTP path builder', () => {
  it.each([
    ['/info/refs', '/asil/demo.git/info/refs'],
    ['/git-upload-pack', '/asil/demo.git/git-upload-pack'],
    ['/git-receive-pack', '/asil/demo.git/git-receive-pack'],
  ])('builds allowed Git HTTP path %s', (requestPath, expected) => {
    expect(
      buildGitHttpPathInfo('asil', 'demo', requestPath),
    ).toBe(expected);
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
      buildGitHttpPathInfo(username, 'demo', '/info/refs'),
    ).toThrowError(
      expect.objectContaining({
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
  ])('rejects unsafe repository "%s"', (repositoryName) => {
    expect(() =>
      buildGitHttpPathInfo('asil', repositoryName, '/info/refs'),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_GIT_REPOSITORY_PATH',
      }),
    );
  });

  it.each([
    '/',
    '/HEAD',
    '/config',
    '/objects',
    '/objects/info',
    '/hooks',
    '/git-receive-pack/extra',
    '/git-upload-pack/extra',
    '/../config',
  ])('rejects unsupported Git HTTP path "%s"', (requestPath) => {
    expect(() =>
      buildGitHttpPathInfo('asil', 'demo', requestPath),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_GIT_HTTP_PATH',
      }),
    );
  });
});
