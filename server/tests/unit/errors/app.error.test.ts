import { describe, expect, it } from 'vitest';

import { AppError } from '../../../src/errors/app.error.js';

describe('AppError', () => {
  it('creates an application error with default values', () => {
    const error = new AppError('Something went wrong');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('APPLICATION_ERROR');
  });

  it('creates an application error with custom status code and code', () => {
    const error = new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');

    expect(error.message).toBe('Resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
