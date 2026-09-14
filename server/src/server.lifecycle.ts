import type { Server } from 'node:http';

import { logger } from './config/logger.js';
import prisma from './config/prisma.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let isShuttingDown = false;

export const shutdownServer = async (
  server: Server,
  signal: string,
  exitCode = 0,
): Promise<void> => {
  if (isShuttingDown) {
    logger.warn(
      {
        signal,
      },
      'Shutdown already in progress',
    );

    return;
  }

  isShuttingDown = true;

  logger.info(
    {
      signal,
      exitCode,
    },
    'Graceful shutdown started',
  );

  const forceShutdownTimer = setTimeout(() => {
    logger.error(
      {
        timeoutMs: SHUTDOWN_TIMEOUT_MS,
      },
      'Graceful shutdown timed out',
    );

    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  forceShutdownTimer.unref();

  server.close(async () => {
    clearTimeout(forceShutdownTimer);

    try {
      await prisma.$disconnect();

      logger.info('Database connection closed');
      logger.info('Server stopped');

      process.exit(exitCode);
    } catch (error) {
      logger.error(
        {
          err: error,
        },
        'Failed to close database connection during shutdown',
      );

      process.exit(1);
    }
  });
};

export const resetShutdownState = (): void => {
  isShuttingDown = false;
};

export const registerProcessHandlers = (server: Server): void => {
  process.on('SIGINT', () => {
    void shutdownServer(server, 'SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdownServer(server, 'SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal(
      {
        err: error,
      },
      'Uncaught exception',
    );

    void shutdownServer(server, 'uncaughtException', 1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal(
      {
        reason,
      },
      'Unhandled promise rejection',
    );

    void shutdownServer(server, 'unhandledRejection', 1);
  });
};
