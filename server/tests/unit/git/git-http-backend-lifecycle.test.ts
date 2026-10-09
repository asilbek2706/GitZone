import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { env } from '../../../src/config/env.js';
import { executeGitHttpBackend } from '../../../src/services/git/git-http-backend.service.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();

  return {
    ...actual,
    spawn: vi.fn(),
  };
});

const mockedSpawn = vi.mocked(spawn);

const createFixture = () => {
  const req = new PassThrough() as PassThrough & {
    method: string;
    originalUrl: string;
    headers: Record<string, string>;
  };

  req.method = 'GET';
  req.originalUrl = '/asil/demo.git/info/refs?service=git-upload-pack';
  req.headers = {};

  const res = {
    writableEnded: false,
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    end: vi.fn(),
    write: vi.fn(),
    setHeader: vi.fn(),
  };

  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    stdin: PassThrough;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };

  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.killed = false;
  child.kill = vi.fn(() => {
    child.killed = true;
    return true;
  });

  mockedSpawn.mockReturnValue(child as never);

  const execute = () =>
    executeGitHttpBackend({
      req: req as unknown as Request,
      res: res as unknown as Response,
      pathInfo: '/asil/demo.git/info/refs',
      remoteUser: null,
      repositoryOwner: 'asil',
      repositoryName: 'demo',
    });

  return { req, res, child, execute };
};

describe('Git HTTP backend lifecycle', () => {
  it('waits for close after a process error', async () => {
    const { child, execute } = createFixture();

    let settled = false;

    const operation = execute().then(() => {
      settled = true;
    });

    child.emit('error', new Error('spawn failed'));

    await Promise.resolve();

    expect(settled).toBe(false);

    child.emit('close', -2);

    await operation;

    expect(settled).toBe(true);
  });

  it('waits for close after request abort', async () => {
    const { req, child, execute } = createFixture();

    let settled = false;

    const operation = execute().then(() => {
      settled = true;
    });

    req.emit('aborted');

    await Promise.resolve();

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(settled).toBe(false);

    child.emit('close', null);

    await operation;

    expect(settled).toBe(true);
  });

  it('waits for close after oversized CGI headers', async () => {
    const { child, execute } = createFixture();

    let settled = false;

    const operation = execute().then(() => {
      settled = true;
    });

    child.stdout.write(Buffer.alloc(env.GIT_HTTP_MAX_HEADER_BYTES + 1, 0x61));

    await Promise.resolve();

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(settled).toBe(false);

    child.emit('close', null);

    await operation;

    expect(settled).toBe(true);
  });

  it('settles after normal process close', async () => {
    const { child, execute } = createFixture();

    const operation = execute();

    const headers = [
      'Status: 200 OK',
      'Content-Type: application/octet-stream',
      '',
      '',
    ].join('\r\n');

    child.stdout.write(Buffer.from(headers));
    child.stdout.end();

    child.emit('close', 0);

    await expect(operation).resolves.toBeUndefined();
  });
});