import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';

import {
  getActiveSessions,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuth,
  registerUser,
  revokeOtherSessions,
  revokeSession,
} from '../../../src/modules/auth/auth.service.js';

import { verifyAccessToken } from '../../../src/modules/auth/auth.tokens.js';

import {
  getPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../../../src/modules/auth/pat.service.js';

vi.mock('../../../src/modules/auth/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshAuth: vi.fn(),
  getCurrentUser: vi.fn(),
  getActiveSessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock('../../../src/modules/auth/pat.service.js', () => ({
  createPersonalAccessToken: vi.fn(),
  getPersonalAccessTokens: vi.fn(),
  revokePersonalAccessToken: vi.fn(),
}));

vi.mock('../../../src/modules/auth/auth.tokens.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../../src/modules/git/git.http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

const mockedRegisterUser = vi.mocked(registerUser);

const mockedLoginUser = vi.mocked(loginUser);

const mockedRefreshAuth = vi.mocked(refreshAuth);

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const mockedGetActiveSessions = vi.mocked(getActiveSessions);

const mockedRevokeOtherSessions = vi.mocked(revokeOtherSessions);

const mockedRevokeSession = vi.mocked(revokeSession);

const mockedLogoutUser = vi.mocked(logoutUser);

const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const mockedGetPersonalAccessTokens = vi.mocked(getPersonalAccessTokens);

const mockedRevokePersonalAccessToken = vi.mocked(revokePersonalAccessToken);

const createdAt = new Date();
const updatedAt = new Date();

const user = {
  id: 'user-1',
  username: 'asil',
  email: 'asil@example.com',
  name: 'Asil',
  avatarUrl: null,
  bio: null,
  createdAt,
  updatedAt,
};

describe('auth API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('registers a user', async () => {
    mockedRegisterUser.mockResolvedValue({
      user,
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .set('User-Agent', 'GitZone-Test-Agent/1.0')
      .send({
        username: 'asil',
        email: 'asil@example.com',
        password: 'Password123!',
        name: 'Asil',
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'user-1',
          username: 'asil',
          email: 'asil@example.com',
        },
        accessToken: 'access-token-1',
      },
    });

    expect(response.headers['set-cookie']).toBeDefined();

    expect(mockedRegisterUser).toHaveBeenCalledWith(
      {
        username: 'asil',
        email: 'asil@example.com',
        password: 'Password123!',
        name: 'Asil',
      },
      {
        userAgent: 'GitZone-Test-Agent/1.0',
        ipAddress: '::ffff:127.0.0.1',
      },
    );
  });

  it('logs in a user', async () => {
    mockedLoginUser.mockResolvedValue({
      user,
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'asil@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'user-1',
          username: 'asil',
        },
        accessToken: 'access-token-2',
      },
    });

    expect(response.headers['set-cookie']).toBeDefined();

    expect(mockedLoginUser).toHaveBeenCalledWith(
      {
        email: 'asil@example.com',
        password: 'Password123!',
      },
      {
        userAgent: null,
        ipAddress: '::ffff:127.0.0.1',
      },
    );
  });

  it('returns current authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedGetCurrentUser.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedGetCurrentUser).toHaveBeenCalledWith('user-1');

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'user-1',
          username: 'asil',
          email: 'asil@example.com',
        },
      },
    });
  });

  it('returns active sessions for authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    const sessions = [
      {
        id: 'session-1',
        userAgent: 'GitZone-Test-Agent/1.0',
        ipAddress: '127.0.0.1',
        lastUsedAt: new Date('2026-09-15T10:00:00.000Z'),
        expiresAt: new Date('2026-09-22T10:00:00.000Z'),
        createdAt: new Date('2026-09-15T09:00:00.000Z'),
      },
    ];

    mockedGetActiveSessions.mockResolvedValue(sessions);

    const response = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedGetActiveSessions).toHaveBeenCalledWith('user-1');

    expect(response.body).toMatchObject({
      success: true,
      data: {
        sessions: [
          {
            id: 'session-1',
            userAgent: 'GitZone-Test-Agent/1.0',
            ipAddress: '127.0.0.1',
            lastUsedAt: '2026-09-15T10:00:00.000Z',
            expiresAt: '2026-09-22T10:00:00.000Z',
            createdAt: '2026-09-15T09:00:00.000Z',
          },
        ],
      },
    });

    expect(response.body.data.sessions[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('revokes all other active sessions while preserving the current session', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedRevokeOtherSessions.mockResolvedValue(3);

    const response = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', 'Bearer test-access-token')
      .set('Cookie', 'refreshToken=current-refresh-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedRevokeOtherSessions).toHaveBeenCalledWith('user-1', 'current-refresh-token');

    expect(response.body).toEqual({
      success: true,
      data: {
        revokedSessions: 3,
      },
      message: 'Other sessions revoked successfully',
    });
  });

  it('rejects revoking other sessions without refresh cookie', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    const response = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(401);

    expect(mockedRevokeOtherSessions).not.toHaveBeenCalled();

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required',
      },
    });
  });

  it('rejects revoking other sessions when the current refresh session is invalid', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedRevokeOtherSessions.mockRejectedValue(
      new AppError('Current refresh session is invalid', 401, 'INVALID_REFRESH_SESSION'),
    );

    const response = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', 'Bearer test-access-token')
      .set('Cookie', 'refreshToken=stale-refresh-token');

    expect(response.status).toBe(401);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedRevokeOtherSessions).toHaveBeenCalledWith('user-1', 'stale-refresh-token');

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_REFRESH_SESSION',
        message: 'Current refresh session is invalid',
      },
    });
  });

  it('revokes an active session for authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedRevokeSession.mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/api/auth/sessions/session-1')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedRevokeSession).toHaveBeenCalledWith('user-1', 'session-1');

    expect(response.body).toEqual({
      success: true,
      message: 'Session revoked successfully',
    });
  });

  it('rejects session revocation without authentication', async () => {
    const response = await request(app).delete('/api/auth/sessions/session-1');

    expect(response.status).toBe(401);

    expect(mockedRevokeSession).not.toHaveBeenCalled();
  });

  it('returns 404 when session cannot be revoked', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedRevokeSession.mockRejectedValue(
      new AppError('Session not found', 404, 'SESSION_NOT_FOUND'),
    );

    const response = await request(app)
      .delete('/api/auth/sessions/session-999')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(404);

    expect(mockedRevokeSession).toHaveBeenCalledWith('user-1', 'session-999');

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      },
    });
  });

  it('rejects sessions request without authentication', async () => {
    const response = await request(app).get('/api/auth/sessions');

    expect(response.status).toBe(401);

    expect(mockedGetActiveSessions).not.toHaveBeenCalled();
  });

  it('refreshes authentication using refresh cookie', async () => {
    mockedLoginUser.mockResolvedValue({
      user,
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });

    mockedRefreshAuth.mockResolvedValue({
      user,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/auth/login').send({
      email: 'asil@example.com',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);

    const refreshResponse = await agent.post('/api/auth/refresh');

    expect(refreshResponse.status).toBe(200);

    expect(refreshResponse.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'user-1',
          username: 'asil',
        },
        accessToken: 'new-access-token',
      },
    });

    expect(mockedRefreshAuth).toHaveBeenCalledWith('refresh-token-2', {
      userAgent: null,
      ipAddress: '::ffff:127.0.0.1',
    });

    expect(refreshResponse.headers['set-cookie']).toBeDefined();
  });

  it('rejects refresh without refresh cookie', async () => {
    const response = await request(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required',
      },
    });

    expect(mockedRefreshAuth).not.toHaveBeenCalled();
  });

  it('logs out and clears refresh cookie', async () => {
    mockedLoginUser.mockResolvedValue({
      user,
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });

    mockedLogoutUser.mockResolvedValue(undefined);

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/auth/login').send({
      email: 'asil@example.com',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post('/api/auth/logout');

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Logged out successfully',
    });

    expect(mockedLogoutUser).toHaveBeenCalledWith('refresh-token-2');

    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('rejects invalid register payload', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: '',
      email: 'invalid-email',
      password: '123',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    });

    expect(mockedRegisterUser).not.toHaveBeenCalled();
  });

  it('rejects invalid login payload', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: '',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    });

    expect(mockedLoginUser).not.toHaveBeenCalled();
  });

  it('returns personal access tokens for authenticated user', async () => {
    const tokenCreatedAt = new Date('2026-09-13T08:00:00.000Z');
    const lastUsedAt = new Date('2026-09-13T09:00:00.000Z');

    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedGetPersonalAccessTokens.mockResolvedValue([
      {
        id: 'pat-1',
        name: 'Laptop token',
        tokenPrefix: 'gzp_example',
        expiresAt: null,
        lastUsedAt,
        createdAt: tokenCreatedAt,
      },
    ]);

    const response = await request(app)
      .get('/api/auth/tokens')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedGetPersonalAccessTokens).toHaveBeenCalledWith('user-1');

    expect(response.body).toEqual({
      success: true,
      data: {
        tokens: [
          {
            id: 'pat-1',
            name: 'Laptop token',
            tokenPrefix: 'gzp_example',
            expiresAt: null,
            lastUsedAt: lastUsedAt.toISOString(),
            createdAt: tokenCreatedAt.toISOString(),
          },
        ],
      },
    });

    expect(response.body.data.tokens[0]).not.toHaveProperty('tokenHash');
    expect(response.body.data.tokens[0]).not.toHaveProperty('token');
  });

  it('revokes a personal access token for authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedRevokePersonalAccessToken.mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/api/auth/tokens/pat-1')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedRevokePersonalAccessToken).toHaveBeenCalledWith('user-1', 'pat-1');

    expect(response.body).toEqual({
      success: true,
      message: 'Personal access token revoked successfully',
    });
  });

  it('returns 400 for malformed JSON payload', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"test@example.com"');

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload',
      },
    });
  });
});
