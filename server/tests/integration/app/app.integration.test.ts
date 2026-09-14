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
});
