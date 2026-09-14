import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import prisma from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
    },
    'Server started',
  );
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info(
    {
      signal,
    },
    'Graceful shutdown started',
  );

  server.close(async () => {
    await prisma.$disconnect();

    logger.info('Database connection closed');
    logger.info('Server stopped');

    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
