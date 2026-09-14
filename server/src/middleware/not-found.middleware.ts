import type { RequestHandler } from 'express';

import { AppError } from '../errors/app.error.js';

export const notFoundMiddleware: RequestHandler = (_req, _res, next): void => {
  next(new AppError('Route not found', 404, 'ROUTE_NOT_FOUND'));
};
