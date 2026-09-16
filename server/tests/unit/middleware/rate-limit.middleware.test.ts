import express from 'express';
import type { Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const createTestApp = (
  limit: number,
  options: {
    skipSuccessfulRequests?: boolean;
  } = {},
): Express => {
  const app = express();

  const limiter = rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
        },
      });
    },
  });

  app.get('/test', limiter, (_req, res) => {
    res.status(200).json({
      success: true,
    });
  });

  app.get('/failed', limiter, (_req, res) => {
    res.status(401).json({
      success: false,
    });
  });

  return app;
};

describe('rate limit middleware', () => {
  it('allows requests while the client is below the limit', async () => {
    const app = createTestApp(2);

    const firstResponse = await request(app).get('/test');
    const secondResponse = await request(app).get('/test');

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
  });

  it('returns 429 when the client exceeds the limit', async () => {
    const app = createTestApp(2);

    await request(app).get('/test');
    await request(app).get('/test');

    const response = await request(app).get('/test');

    expect(response.status).toBe(429);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      },
    });
  });

  it('returns standard rate limit headers', async () => {
    const app = createTestApp(2);

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.headers['ratelimit']).toBeDefined();
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('does not count successful requests when skipSuccessfulRequests is enabled', async () => {
    const app = createTestApp(1, {
      skipSuccessfulRequests: true,
    });

    const firstResponse = await request(app).get('/test');
    const secondResponse = await request(app).get('/test');
    const thirdResponse = await request(app).get('/test');

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(thirdResponse.status).toBe(200);
  });

  it('counts failed requests when skipSuccessfulRequests is enabled', async () => {
    const app = createTestApp(2, {
      skipSuccessfulRequests: true,
    });

    const firstResponse = await request(app).get('/failed');
    const secondResponse = await request(app).get('/failed');
    const thirdResponse = await request(app).get('/failed');

    expect(firstResponse.status).toBe(401);
    expect(secondResponse.status).toBe(401);

    expect(thirdResponse.status).toBe(429);
    expect(thirdResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('does not expose legacy X-RateLimit headers', async () => {
    const app = createTestApp(2);

    const response = await request(app).get('/test');

    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
    expect(response.headers['x-ratelimit-reset']).toBeUndefined();
  });
});
