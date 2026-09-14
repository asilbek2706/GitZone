import type { ErrorRequestHandler } from 'express';

import { AppError } from '../errors/app.error.js';

type JsonParseError = SyntaxError & {
  type?: string;
};

type PayloadTooLargeError = Error & {
  status?: number;
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

  if (
    error instanceof Error &&
    (error as PayloadTooLargeError).status === 413 &&
    (error as PayloadTooLargeError).type === 'entity.too.large'
  ) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
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
