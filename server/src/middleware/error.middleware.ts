import type { ErrorRequestHandler } from 'express';

import { AppError } from '../errors/app.error.js';

type JsonParseError = SyntaxError & {
  type?: string;
};

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof SyntaxError && (error as JsonParseError).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload',
      },
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
};
