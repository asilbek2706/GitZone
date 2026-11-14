import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ssh2 from 'ssh2';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

import { attachGitSshAuthenticationHandler } from './git-ssh-authentication-handler.service.js';
import { attachGitSshSessionHandler } from './git-ssh-session-handler.service.js';

type GitSshServer = InstanceType<typeof ssh2.Server>;

let gitSshServer: GitSshServer | null = null;
let startPromise: Promise<void> | null = null;

const loadHostPrivateKey = async (): Promise<Buffer> => {
  const configuredPath = env.GIT_SSH_HOST_KEY_PATH;

  if (!configuredPath) {
    throw new Error('GIT_SSH_HOST_KEY_PATH is required when SSH is enabled');
  }

  const hostKeyPath = resolve(configuredPath);
  const metadata = await lstat(hostKeyPath);

  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error('SSH host key must be a regular file');
  }

  if (process.platform !== 'win32' && (metadata.mode & 0o077) !== 0) {
    throw new Error('SSH host private key permissions must be 0600 or stricter');
  }

  const hostKey = await readFile(hostKeyPath);

  if (hostKey.length === 0) {
    throw new Error('SSH host private key file is empty');
  }

  return hostKey;
};

const listen = (server: GitSshServer): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const handleListening = (): void => {
      cleanup();
      resolvePromise();
    };

    const handleError = (error: Error): void => {
      cleanup();
      rejectPromise(error);
    };

    const cleanup = (): void => {
      server.removeListener('listening', handleListening);
      server.removeListener('error', handleError);
    };

    server.once('listening', handleListening);
    server.once('error', handleError);

    try {
      server.listen(env.GIT_SSH_PORT, env.GIT_SSH_HOST);
    } catch (error) {
      cleanup();
      rejectPromise(error);
    }
  });

const startGitSshServerInternal = async (): Promise<void> => {
  if (!env.GIT_SSH_ENABLED) {
    logger.info('Git SSH server is disabled');
    return;
  }

  const hostKey = await loadHostPrivateKey();

  const server = new ssh2.Server(
    {
      hostKeys: [hostKey],
      banner: 'GitZone Git SSH service',
    },
    (connection, connectionInfo) => {
      const remoteAddress = connectionInfo.ip || 'unknown';

      logger.info(
        {
          remoteAddress,
          remotePort: connectionInfo.port,
        },
        'New GitZone SSH connection',
      );

      const authentication = attachGitSshAuthenticationHandler(connection, remoteAddress);

      attachGitSshSessionHandler(connection, authentication, remoteAddress);
    },
  );

  server.on('error', (error: Error) => {
    logger.error(
      {
        err: error,
        host: env.GIT_SSH_HOST,
        port: env.GIT_SSH_PORT,
      },
      'GitZone SSH server error',
    );
  });

  await listen(server);

  gitSshServer = server;

  logger.info(
    {
      host: env.GIT_SSH_HOST,
      port: env.GIT_SSH_PORT,
    },
    'GitZone SSH server started',
  );
};

export const startGitSshServer = async (): Promise<void> => {
  if (gitSshServer) {
    return;
  }

  if (startPromise) {
    return startPromise;
  }

  startPromise = startGitSshServerInternal();

  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
};

export const stopGitSshServer = async (): Promise<void> => {
  const server = gitSshServer;

  if (!server) {
    return;
  }

  gitSshServer = null;

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close((error?: Error) => {
      if (error) {
        rejectPromise(error);
        return;
      }

      resolvePromise();
    });
  });

  logger.info('GitZone SSH server stopped');
};
