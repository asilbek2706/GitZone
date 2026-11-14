import type { Connection } from 'ssh2';

import { logger } from '../../config/logger.js';
import {
  authenticateSshPublicKey,
  type SshPublicKeyAuthenticationResult,
} from '../auth/ssh-key-authentication.service.js';

const SSH_GIT_USERNAME = 'git';
const MAX_AUTHENTICATION_ATTEMPTS = 12;

export type AuthenticatedGitSshUser = {
  userId: string;
  username: string;
  sshKeyId: string;
};

export type GitSshAuthenticationHandler = {
  getAuthenticatedUser: () => AuthenticatedGitSshUser | null;
};

export const attachGitSshAuthenticationHandler = (
  connection: Connection,
  remoteAddress: string,
): GitSshAuthenticationHandler => {
  let authenticatedUser: AuthenticatedGitSshUser | null = null;
  let authenticationAttempts = 0;

  connection.on('authentication', (ctx) => {
    authenticationAttempts += 1;

    if (authenticationAttempts > MAX_AUTHENTICATION_ATTEMPTS) {
      ctx.reject();
      return;
    }

    if (ctx.username !== SSH_GIT_USERNAME || ctx.method !== 'publickey') {
      ctx.reject(['publickey']);
      return;
    }

    let requestAborted = false;

    ctx.once('abort', () => {
      requestAborted = true;
    });

    const authenticationInput = {
      keyAlgorithm: ctx.key.algo,
      keyData: ctx.key.data,
      ...(ctx.blob !== undefined && {
        signedData: ctx.blob,
      }),
      ...(ctx.signature !== undefined && {
        signature: ctx.signature,
      }),
      ...(ctx.hashAlgo !== undefined && {
        hashAlgorithm: ctx.hashAlgo,
      }),
    };

    void authenticateSshPublicKey(authenticationInput)
      .then((result: SshPublicKeyAuthenticationResult | null) => {
        if (requestAborted) {
          return;
        }

        if (!result) {
          ctx.reject(['publickey']);
          return;
        }

        /*
         * An unsigned request only checks whether the public key
         * is registered. It must not authenticate the connection.
         */
        if (result.status === 'KEY_MATCHED') {
          ctx.accept();
          return;
        }

        authenticatedUser = {
          userId: result.userId,
          username: result.username,
          sshKeyId: result.keyId,
        };

        logger.info(
          {
            remoteAddress,
            userId: result.userId,
            username: result.username,
            sshKeyId: result.keyId,
          },
          'Git SSH public key authentication successful',
        );

        ctx.accept();
      })
      .catch((error: unknown) => {
        logger.error(
          {
            err: error,
            remoteAddress,
          },
          'Git SSH public key authentication failed',
        );

        if (!requestAborted) {
          ctx.reject(['publickey']);
        }
      });
  });

  return {
    getAuthenticatedUser: () => authenticatedUser,
  };
};
