import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../../src/app.js';

describe('App integration', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      service: 'gitzone-server',
      status: 'healthy',
    });
  });

  it('returns liveness status', async () => {
    const response = await request(app).get('/api/health/live');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      service: 'gitzone-server',
      status: 'alive',
    });
  });

  it('returns readiness status when database is available', async () => {
    const response = await request(app).get('/api/health/ready');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      service: 'gitzone-server',
      status: 'ready',
      database: 'connected',
    });
  });

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

  it('adds security headers to responses', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['referrer-policy']).toBeDefined();
  });

  it('allows the configured CORS origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow an unconfigured CORS origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('returns a different request id for separate requests', async () => {
    const firstResponse = await request(app).get('/api/health');
    const secondResponse = await request(app).get('/api/health');

    const firstRequestId = firstResponse.headers['x-request-id'];
    const secondRequestId = secondResponse.headers['x-request-id'];

    expect(firstRequestId).toBeDefined();
    expect(secondRequestId).toBeDefined();
    expect(firstRequestId).not.toBe(secondRequestId);
  });
});
