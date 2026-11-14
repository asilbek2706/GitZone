import type { Connection, ServerChannel } from 'ssh2';

import { logger } from '../../config/logger.js';
import type { GitSshAuthenticationHandler } from './git-ssh-authentication-handler.service.js';
import { executeGitSshCommand } from './git-ssh-transport.service.js';

const closeWithError = (channel: ServerChannel): void => {
  if (channel.destroyed) {
    return;
  }

  channel.stderr.end('GitZone SSH session failed\n');
  channel.exit(1);
  channel.end();
};

export const attachGitSshSessionHandler = (
  connection: Connection,
  authentication: GitSshAuthenticationHandler,
  remoteAddress: string,
): void => {
  /*
   * Reject SSH global requests such as TCP forwarding.
   * Git repository access does not require port forwarding.
   */
  connection.on('request', (_accept, reject) => {
    reject?.();
  });

  connection.on('ready', () => {
    const authenticatedUser = authentication.getAuthenticatedUser();

    if (!authenticatedUser) {
      logger.warn(
        { remoteAddress },
        'SSH connection became ready without an authenticated GitZone user',
      );

      connection.end();
      return;
    }

    logger.info(
      {
        remoteAddress,
        userId: authenticatedUser.userId,
        username: authenticatedUser.username,
        sshKeyId: authenticatedUser.sshKeyId,
      },
      'GitZone SSH connection authenticated',
    );

    connection.on('session', (acceptSession) => {
      const session = acceptSession();

      let execRequestHandled = false;

      session.on('exec', (acceptExec, rejectExec, info) => {
        if (execRequestHandled) {
          rejectExec();
          return;
        }

        const currentUser = authentication.getAuthenticatedUser();

        if (!currentUser) {
          rejectExec();
          return;
        }

        execRequestHandled = true;

        const channel = acceptExec();

        void executeGitSshCommand({
          command: info.command,
          authenticatedUser: currentUser,
          channel,
        }).catch((error: unknown) => {
          logger.error(
            {
              err: error,
              remoteAddress,
              userId: currentUser.userId,
              username: currentUser.username,
            },
            'Unexpected Git SSH session failure',
          );

          closeWithError(channel);
        });
      });

      /*
       * Git Smart SSH transport only needs a non-interactive exec
       * request. Shells, PTYs, SFTP and arbitrary subsystems are
       * deliberately unavailable.
       */
      session.on('shell', (_accept, reject) => reject());
      session.on('pty', (_accept, reject) => reject());
      session.on('sftp', (_accept, reject) => reject());
      session.on('subsystem', (_accept, reject) => reject());

      /*
       * Do not let a client inject environment variables into
       * Git child processes or request agent/X11 forwarding.
       */
      session.on('env', (_accept, reject) => reject());
      session.on('auth-agent', (_accept, reject) => reject());
      session.on('x11', (_accept, reject) => reject());

      /*
       * Interactive terminal features are not part of Git
       * Smart SSH transport.
       */
      session.on('window-change', (_accept, reject) => reject());
      session.on('signal', (_accept, reject) => reject());

      session.on('close', () => {
        logger.debug(
          {
            remoteAddress,
            userId: authenticatedUser.userId,
          },
          'GitZone SSH session closed',
        );
      });
    });
  });

  connection.on('error', (error) => {
    logger.warn(
      {
        err: error,
        remoteAddress,
        userId: authentication.getAuthenticatedUser()?.userId,
      },
      'GitZone SSH connection error',
    );
  });

  connection.on('close', () => {
    logger.debug({ remoteAddress }, 'GitZone SSH connection closed');
  });
};
