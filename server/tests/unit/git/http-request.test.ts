import { describe, expect, it } from 'vitest';

import { classifyGitHttpRequest } from '../../../src/utils/git/http-request.js';

describe('Git HTTP request classifier', () => {
  it('classifies upload-pack discovery as READ', () => {
    expect(classifyGitHttpRequest('GET', '/info/refs', 'git-upload-pack')).toEqual({
      accessType: 'READ',
      service: 'git-upload-pack',
    });
  });

  it('classifies receive-pack discovery as WRITE', () => {
    expect(classifyGitHttpRequest('GET', '/info/refs', 'git-receive-pack')).toEqual({
      accessType: 'WRITE',
      service: 'git-receive-pack',
    });
  });

  it('classifies upload-pack RPC as READ', () => {
    expect(classifyGitHttpRequest('POST', '/git-upload-pack', undefined)).toEqual({
      accessType: 'READ',
      service: 'git-upload-pack',
    });
  });

  it('classifies receive-pack RPC as WRITE', () => {
    expect(classifyGitHttpRequest('POST', '/git-receive-pack', undefined)).toEqual({
      accessType: 'WRITE',
      service: 'git-receive-pack',
    });
  });

  it.each([
    ['POST', '/info/refs', 'git-upload-pack'],
    ['GET', '/git-upload-pack', undefined],
    ['GET', '/git-receive-pack', undefined],
  ])('rejects invalid method %s %s', (method, path, service) => {
    expect(() => classifyGitHttpRequest(method, path, service)).toThrowError(
      expect.objectContaining({
        statusCode: 405,
        code: 'INVALID_GIT_HTTP_METHOD',
      }),
    );
  });

  it.each([undefined, '', 'git-evil-pack', ['git-upload-pack']])(
    'rejects invalid discovery service',
    (service) => {
      expect(() => classifyGitHttpRequest('GET', '/info/refs', service)).toThrowError(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_GIT_HTTP_SERVICE',
        }),
      );
    },
  );

  it('rejects service query on RPC endpoint', () => {
    expect(() =>
      classifyGitHttpRequest('POST', '/git-upload-pack', 'git-upload-pack'),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_GIT_HTTP_SERVICE',
      }),
    );
  });

  it('rejects unsupported path', () => {
    expect(() => classifyGitHttpRequest('GET', '/HEAD', undefined)).toThrowError(
      expect.objectContaining({
        code: 'INVALID_GIT_HTTP_PATH',
      }),
    );
  });
});
