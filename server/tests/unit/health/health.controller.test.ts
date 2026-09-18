import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

import prisma from '../../../src/config/prisma.js';
import {
  getHealth,
  getLiveness,
  getReadiness,
} from '../../../src/controllers/health/health.controller.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

const createResponse = (): Response => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;

  vi.mocked(res.status).mockReturnValue(res);

  return res;
};

describe('Health controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns healthy status', () => {
    const req = {} as Request;
    const res = createResponse();

    getHealth(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      service: 'gitzone-server',
      status: 'healthy',
    });
  });

  it('returns alive status', () => {
    const req = {} as Request;
    const res = createResponse();

    getLiveness(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      service: 'gitzone-server',
      status: 'alive',
    });
  });

  it('returns ready status when database is available', async () => {
    const req = {} as Request;
    const res = createResponse();

    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    await getReadiness(req, res, vi.fn());

    expect(mockedQueryRaw).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      service: 'gitzone-server',
      status: 'ready',
      database: 'connected',
    });
  });

  it('returns 503 when database is unavailable', async () => {
    const req = {} as Request;
    const res = createResponse();

    mockedQueryRaw.mockRejectedValue(new Error('Database unavailable'));

    await getReadiness(req, res, vi.fn());

    expect(mockedQueryRaw).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      service: 'gitzone-server',
      status: 'not_ready',
      database: 'disconnected',
    });
  });
});
