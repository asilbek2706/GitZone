import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Server } from 'node:http';

import prisma from '../../../src/config/prisma.js';
import { logger } from '../../../src/config/logger.js';
import {
  registerProcessHandlers,
  resetShutdownState,
  shutdownServer,
} from '../../../src/server.lifecycle.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    $disconnect: vi.fn(),
  },
}));

vi.mock('../../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

const mockedDisconnect = vi.mocked(prisma.$disconnect);

const createServer = (): Server => {
  return {
    close: vi.fn(),
    closeAllConnections: vi.fn(),
  } as unknown as Server;
};

describe('Server lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetShutdownState();
  });

  it('gracefully shuts down the server', async () => {
    const server = createServer();

    mockedDisconnect.mockResolvedValue(undefined);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await shutdownServer(server, 'SIGINT');

    expect(server.close).toHaveBeenCalledOnce();
    expect(mockedDisconnect).toHaveBeenCalledOnce();

    expect(logger.info).toHaveBeenCalledWith(
      {
        signal: 'SIGINT',
        exitCode: 0,
      },
      'Graceful shutdown started',
    );

    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('prevents duplicate shutdown attempts', async () => {
    const server = createServer();

    vi.mocked(server.close).mockImplementation(() => server);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await shutdownServer(server, 'SIGINT');
    await shutdownServer(server, 'SIGTERM');

    expect(server.close).toHaveBeenCalledOnce();

    expect(logger.warn).toHaveBeenCalledWith(
      {
        signal: 'SIGTERM',
      },
      'Shutdown already in progress',
    );

    exitSpy.mockRestore();
  });

  it('exits with code 1 when database disconnect fails', async () => {
    const server = createServer();

    const disconnectError = new Error('Database disconnect failed');

    mockedDisconnect.mockRejectedValue(disconnectError);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await shutdownServer(server, 'SIGTERM');

    expect(logger.error).toHaveBeenCalledWith(
      {
        err: disconnectError,
      },
      'Failed to close database connection during shutdown',
    );

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('forces shutdown when graceful shutdown times out', async () => {
    vi.useFakeTimers();

    const server = createServer();

    vi.mocked(server.close).mockImplementation(() => server);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await shutdownServer(server, 'SIGTERM');

    await vi.advanceTimersByTimeAsync(10_000);

    expect(logger.error).toHaveBeenCalledWith(
      {
        timeoutMs: 10_000,
      },
      'Graceful shutdown timed out',
    );

    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    vi.useRealTimers();
  });

  it('handles uncaught exceptions', async () => {
    const server = createServer();

    mockedDisconnect.mockResolvedValue(undefined);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const beforeListeners = process.listeners('uncaughtException');

    registerProcessHandlers(server);

    const afterListeners = process.listeners('uncaughtException');

    const handler = afterListeners.find((listener) => !beforeListeners.includes(listener));

    expect(handler).toBeDefined();

    const error = new Error('Unexpected failure');

    handler?.(error, 'uncaughtException');

    await vi.waitFor(() => {
      expect(logger.fatal).toHaveBeenCalledWith(
        {
          err: error,
        },
        'Uncaught exception',
      );

      expect(server.close).toHaveBeenCalledOnce();
      expect(mockedDisconnect).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    if (handler) {
      process.removeListener('uncaughtException', handler);
    }

    exitSpy.mockRestore();
  });

  it('handles unhandled promise rejections', async () => {
    const server = createServer();

    mockedDisconnect.mockResolvedValue(undefined);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const beforeListeners = process.listeners('unhandledRejection');

    registerProcessHandlers(server);

    const afterListeners = process.listeners('unhandledRejection');

    const handler = afterListeners.find((listener) => !beforeListeners.includes(listener));

    expect(handler).toBeDefined();

    const reason = new Error('Promise failed');

    handler?.(reason, Promise.resolve());

    await vi.waitFor(() => {
      expect(logger.fatal).toHaveBeenCalledWith(
        {
          reason,
        },
        'Unhandled promise rejection',
      );

      expect(server.close).toHaveBeenCalledOnce();
      expect(mockedDisconnect).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    if (handler) {
      process.removeListener('unhandledRejection', handler);
    }

    exitSpy.mockRestore();
  });

  it('handles SIGINT', async () => {
    const server = createServer();

    mockedDisconnect.mockResolvedValue(undefined);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const beforeListeners = process.listeners('SIGINT');

    registerProcessHandlers(server);

    const afterListeners = process.listeners('SIGINT');

    const handler = afterListeners.find((listener) => !beforeListeners.includes(listener));

    expect(handler).toBeDefined();

    handler?.('SIGINT');

    await vi.waitFor(() => {
      expect(server.close).toHaveBeenCalledOnce();
      expect(mockedDisconnect).toHaveBeenCalledOnce();

      expect(logger.info).toHaveBeenCalledWith(
        {
          signal: 'SIGINT',
          exitCode: 0,
        },
        'Graceful shutdown started',
      );

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    if (handler) {
      process.removeListener('SIGINT', handler);
    }

    exitSpy.mockRestore();
  });

  it('handles SIGTERM', async () => {
    const server = createServer();

    mockedDisconnect.mockResolvedValue(undefined);

    vi.mocked(server.close).mockImplementation((callback) => {
      if (callback) {
        callback();
      }

      return server;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const beforeListeners = process.listeners('SIGTERM');

    registerProcessHandlers(server);

    const afterListeners = process.listeners('SIGTERM');

    const handler = afterListeners.find((listener) => !beforeListeners.includes(listener));

    expect(handler).toBeDefined();

    handler?.('SIGTERM');

    await vi.waitFor(() => {
      expect(server.close).toHaveBeenCalledOnce();
      expect(mockedDisconnect).toHaveBeenCalledOnce();

      expect(logger.info).toHaveBeenCalledWith(
        {
          signal: 'SIGTERM',
          exitCode: 0,
        },
        'Graceful shutdown started',
      );

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    if (handler) {
      process.removeListener('SIGTERM', handler);
    }

    exitSpy.mockRestore();
  });
});
