import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  createLoginRateLimiter,
  createRefreshRateLimiter,
  createRegisterRateLimiter,
  createSecurityActionRateLimiter,
} from '../../../src/middleware/rate-limit.middleware.js';

describe('auth rate limit policies', () => {
  it('rate limits repeated failed login attempts after 10 failures', async () => {
    const loginHandler = vi.fn((_req, res) => {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    });

    const app = express();

    app.use(express.json());
    app.post('/api/auth/login', createLoginRateLimiter(), loginHandler);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'attacker@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    }

    const blockedResponse = await request(app).post('/api/auth/login').send({
      email: 'attacker@example.com',
      password: 'WrongPassword123!',
    });

    expect(blockedResponse.status).toBe(429);

    expect(blockedResponse.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
      },
    });

    expect(loginHandler).toHaveBeenCalledTimes(10);
  });

  it('does not consume login failure budget for successful requests', async () => {
    const loginHandler = vi.fn((_req, res) => {
      res.status(200).json({
        success: true,
      });
    });

    const app = express();

    app.use(express.json());
    app.post('/api/auth/login', createLoginRateLimiter(), loginHandler);

    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'asil@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
    }

    expect(loginHandler).toHaveBeenCalledTimes(15);
  });

  it('rate limits registration after 5 failed attempts', async () => {
    const registerHandler = vi.fn((_req, res) => {
      res.status(409).json({
        success: false,
      });
    });

    const app = express();

    app.use(express.json());
    app.post('/api/auth/register', createRegisterRateLimiter(), registerHandler);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post('/api/auth/register').send({
        username: 'attacker',
        email: 'attacker@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(409);
    }

    const blockedResponse = await request(app).post('/api/auth/register').send({
      username: 'attacker',
      email: 'attacker@example.com',
      password: 'Password123!',
    });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(registerHandler).toHaveBeenCalledTimes(5);
  });

  it('rate limits refresh requests after 30 requests', async () => {
    const refreshHandler = vi.fn((_req, res) => {
      res.status(200).json({
        success: true,
      });
    });

    const app = express();

    app.post('/api/auth/refresh', createRefreshRateLimiter(), refreshHandler);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await request(app).post('/api/auth/refresh');

      expect(response.status).toBe(200);
    }

    const blockedResponse = await request(app).post('/api/auth/refresh');

    expect(blockedResponse.status).toBe(429);

    expect(blockedResponse.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many refresh attempts. Please try again later.',
      },
    });

    expect(refreshHandler).toHaveBeenCalledTimes(30);
  });

  it('rate limits security-sensitive actions after 30 requests', async () => {
    const securityHandler = vi.fn((_req, res) => {
      res.status(200).json({
        success: true,
      });
    });

    const app = express();

    app.delete('/api/auth/security-action', createSecurityActionRateLimiter(), securityHandler);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await request(app).delete('/api/auth/security-action');

      expect(response.status).toBe(200);
    }

    const blockedResponse = await request(app).delete('/api/auth/security-action');

    expect(blockedResponse.status).toBe(429);

    expect(blockedResponse.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many security-sensitive requests. Please try again later.',
      },
    });

    expect(securityHandler).toHaveBeenCalledTimes(30);
  });
});
