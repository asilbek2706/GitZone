import type { RequestHandler } from 'express';

import prisma from '../../config/prisma.js';

export const getHealth: RequestHandler = (_req, res): void => {
  res.status(200).json({
    success: true,
    service: 'gitzone-server',
    status: 'healthy',
  });
};

export const getLiveness: RequestHandler = (_req, res): void => {
  res.status(200).json({
    success: true,
    service: 'gitzone-server',
    status: 'alive',
  });
};

export const getReadiness: RequestHandler = async (_req, res): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      service: 'gitzone-server',
      status: 'ready',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      success: false,
      service: 'gitzone-server',
      status: 'not_ready',
      database: 'disconnected',
    });
  }
};
