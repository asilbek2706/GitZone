import { EventEmitter } from 'node:events';

import type { Connection, Session } from 'ssh2';
import { describe, expect, it } from 'vitest';

import { attachGitSshSessionHandler } from '../../../src/services/git/git-ssh-session-handler.service.js';

const createSession = () => {
  const connection = new EventEmitter();
  const session = new EventEmitter();

  const authentication = {
    getAuthenticatedUser: () => ({
      userId: 'user-1',
      username: 'test-user',
      sshKeyId: 'ssh-key-1',
    }),
  };

  attachGitSshSessionHandler(
    connection as unknown as Connection,
    authentication,
    '127.0.0.1',
  );

  connection.emit('ready');
  connection.emit('session', () => session as unknown as Session);

  return session;
};

describe('Git SSH session handler', () => {
  it('handles env requests without a reply callback', () => {
    const session = createSession();

    expect(() => {
      session.emit('env', undefined, undefined, {
        key: 'GIT_PROTOCOL',
        value: 'version=2',
      });
    }).not.toThrow();
  });

  it('rejects env requests when a rejection callback is provided', () => {
    const session = createSession();
    let rejected = false;

    session.emit(
      'env',
      undefined,
      () => {
        rejected = true;
      },
      {
        key: 'GIT_PROTOCOL',
        value: 'version=2',
      },
    );

    expect(rejected).toBe(true);
  });
});
