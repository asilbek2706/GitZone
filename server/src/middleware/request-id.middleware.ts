import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export const requestIdMiddleware: RequestHandler = (_req, res, next): void => {
  const requestId = randomUUID();

  res.setHeader('X-Request-Id', requestId);

  next();
};
