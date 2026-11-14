import type { Server } from 'node:http';

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import prisma from './config/prisma.js';
import { registerProcessHandlers } from './server.lifecycle.js';

import { startGitSshServer } from './services/git/git-ssh-server.service.js';

export const verifyDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};

export const startServer = async (): Promise<Server> => {
  await verifyDatabaseConnection();

  logger.info('Database connection verified');

  // SSH server HTTP server bilan birga ishga tushadi.
  // GIT_SSH_ENABLED=false bo'lsa, SSH server ishga tushirilmaydi.
  await startGitSshServer();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
      },
      'Server started',
    );
  });

  registerProcessHandlers(server);

  return server;
};

export const handleStartupFailure = async (error: unknown): Promise<void> => {
  logger.fatal(
    {
      err: error,
    },
    'Server startup failed',
  );

  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    logger.error(
      {
        err: disconnectError,
      },
      'Failed to close database connection after startup failure',
    );
  }

  process.exitCode = 1;
};
