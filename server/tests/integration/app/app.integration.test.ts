import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../../src/app.js';

describe('App integration', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('rejects request bodies larger than the configured limit', async () => {
    const largePayload = {
      content: 'a'.repeat(1024 * 1024 + 1),
    };

    const response = await request(app).post('/api/auth/login').send(largePayload);

    expect(response.status).toBe(413);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    });
  });

  it('adds a unique request id to responses', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.headers['x-request-id']).toBeDefined();
    expect(typeof response.headers['x-request-id']).toBe('string');
    expect(response.headers['x-request-id']).not.toHaveLength(0);
  });
});
