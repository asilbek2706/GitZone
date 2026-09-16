import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import prisma from '../../../src/config/prisma.js';
import { logger } from '../../../src/config/logger.js';
import { registerProcessHandlers } from '../../../src/server.lifecycle.js';
import {
  handleStartupFailure,
  startServer,
  verifyDatabaseConnection,
} from '../../../src/server.startup.js';

vi.mock('../../../src/app.js', () => ({
  default: {
    listen: vi.fn(),
  },
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

vi.mock('../../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

vi.mock('../../../src/server.lifecycle.js', () => ({
  registerProcessHandlers: vi.fn(),
}));

const mockedQueryRaw = vi.mocked(prisma.$queryRaw);
const mockedDisconnect = vi.mocked(prisma.$disconnect);
const mockedListen = vi.mocked(app.listen);
const mockedRegisterProcessHandlers = vi.mocked(registerProcessHandlers);

describe('Server startup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('verifies the database connection', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    await verifyDatabaseConnection();

    expect(mockedQueryRaw).toHaveBeenCalledOnce();
  });

  it('starts the HTTP server only after the database is available', async () => {
    const server = {
      close: vi.fn(),
    };

    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
    mockedListen.mockReturnValue(server as never);

    const result = await startServer();

    expect(mockedQueryRaw).toHaveBeenCalledOnce();
    expect(mockedListen).toHaveBeenCalledOnce();
    expect(mockedRegisterProcessHandlers).toHaveBeenCalledWith(server);
    expect(result).toBe(server);
  });

  it('does not start the HTTP server when the database is unavailable', async () => {
    const error = new Error('Database unavailable');

    mockedQueryRaw.mockRejectedValue(error);

    await expect(startServer()).rejects.toThrow('Database unavailable');

    expect(mockedListen).not.toHaveBeenCalled();
    expect(mockedRegisterProcessHandlers).not.toHaveBeenCalled();
  });

  it('handles startup failure and disconnects Prisma', async () => {
    const error = new Error('Startup failed');

    mockedDisconnect.mockResolvedValue(undefined);

    await handleStartupFailure(error);

    expect(logger.fatal).toHaveBeenCalledWith(
      {
        err: error,
      },
      'Server startup failed',
    );

    expect(mockedDisconnect).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(1);
  });

  it('handles Prisma disconnect failure during startup cleanup', async () => {
    const startupError = new Error('Startup failed');
    const disconnectError = new Error('Disconnect failed');

    mockedDisconnect.mockRejectedValue(disconnectError);

    await handleStartupFailure(startupError);

    expect(logger.error).toHaveBeenCalledWith(
      {
        err: disconnectError,
      },
      'Failed to close database connection after startup failure',
    );

    expect(process.exitCode).toBe(1);
  });
});
