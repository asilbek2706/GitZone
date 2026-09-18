import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';
import {
  setupTwoFactorAuthentication,
  verifyTwoFactorSetup,
} from '../../../src/modules/auth/two-factor/two-factor.service.js';

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

vi.mock('../../../src/modules/auth/two-factor/two-factor.service.js', () => ({
  setupTwoFactorAuthentication: vi.fn(),
  verifyTwoFactorSetup: vi.fn(),
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

const mockedSetupTwoFactorAuthentication = vi.mocked(setupTwoFactorAuthentication);
const mockedVerifyTwoFactorSetup = vi.mocked(verifyTwoFactorSetup);

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
      requiresTwoFactor: false,
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
        requiresTwoFactor: false,
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

  it('returns a two-factor challenge without authenticated session data', async () => {
    const expiresAt = new Date('2026-09-18T06:00:00.000Z');

    mockedLoginUser.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: 'two-factor-challenge-token',
      expiresAt,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', ['refreshToken=old-refresh-token'])
      .send({
        email: 'asil@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        requiresTwoFactor: true,
        challengeToken: 'two-factor-challenge-token',
        expiresAt: expiresAt.toISOString(),
      },
    });

    expect(response.body.data).not.toHaveProperty('user');

    expect(response.body.data).not.toHaveProperty('accessToken');

    const setCookie = response.headers['set-cookie'];

    expect(setCookie).toBeDefined();

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith('refreshToken=;') &&
          cookie.includes('Path=/api/auth') &&
          cookie.includes('HttpOnly'),
      ),
    ).toBe(true);

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

  it('creates a two-factor authentication setup for authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSetupTwoFactorAuthentication.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      provisioningUri:
        'otpauth://totp/GitZone:asil%40example.com?issuer=GitZone&secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30',
      qrCodeDataUrl: 'data:image/png;base64,test-qr-code',
    });

    const response = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedSetupTwoFactorAuthentication).toHaveBeenCalledWith('user-1');

    expect(response.body).toEqual({
      success: true,
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        provisioningUri:
          'otpauth://totp/GitZone:asil%40example.com?issuer=GitZone&secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30',
        qrCodeDataUrl: 'data:image/png;base64,test-qr-code',
      },
    });
  });

  it('rejects two-factor setup without authentication', async () => {
    const response = await request(app).post('/api/auth/2fa/setup');

    expect(response.status).toBe(401);

    expect(mockedSetupTwoFactorAuthentication).not.toHaveBeenCalled();
  });

  it('returns 404 when two-factor setup user does not exist', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'missing-user',
    } as never);

    mockedSetupTwoFactorAuthentication.mockRejectedValue(
      new AppError('User not found', 404, 'USER_NOT_FOUND'),
    );

    const response = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(404);

    expect(mockedSetupTwoFactorAuthentication).toHaveBeenCalledWith('missing-user');

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
  });

  it('returns 409 when two-factor authentication is already enabled', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSetupTwoFactorAuthentication.mockRejectedValue(
      new AppError(
        'Two-factor authentication is already enabled',
        409,
        'TWO_FACTOR_ALREADY_ENABLED',
      ),
    );

    const response = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', 'Bearer test-access-token');

    expect(response.status).toBe(409);

    expect(mockedSetupTwoFactorAuthentication).toHaveBeenCalledWith('user-1');

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled',
      },
    });
  });

  it('verifies two-factor setup for authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedVerifyTwoFactorSetup.mockResolvedValue({
      recoveryCodes: ['11111111111111111111111111111111', '22222222222222222222222222222222'],
    });

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '123456',
      });

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedVerifyTwoFactorSetup).toHaveBeenCalledWith('user-1', '123456');

    expect(response.body).toEqual({
      success: true,
      data: {
        recoveryCodes: ['11111111111111111111111111111111', '22222222222222222222222222222222'],
      },
    });
  });

  it('rejects two-factor verification without authentication', async () => {
    const response = await request(app).post('/api/auth/2fa/verify').send({
      code: '123456',
    });

    expect(response.status).toBe(401);

    expect(mockedVerifyTwoFactorSetup).not.toHaveBeenCalled();
  });

  it('rejects malformed two-factor verification code', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '12345',
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    });

    expect(mockedVerifyTwoFactorSetup).not.toHaveBeenCalled();
  });

  it('rejects non-numeric two-factor verification code', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '12ab56',
      });

    expect(response.status).toBe(400);

    expect(mockedVerifyTwoFactorSetup).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid two-factor authentication code', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedVerifyTwoFactorSetup.mockRejectedValue(
      new AppError('Invalid two-factor authentication code', 401, 'INVALID_TWO_FACTOR_CODE'),
    );

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '123456',
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_TWO_FACTOR_CODE',
        message: 'Invalid two-factor authentication code',
      },
    });
  });

  it('returns 404 when two-factor setup does not exist during verification', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedVerifyTwoFactorSetup.mockRejectedValue(
      new AppError('Two-factor authentication setup not found', 404, 'TWO_FACTOR_SETUP_NOT_FOUND'),
    );

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '123456',
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TWO_FACTOR_SETUP_NOT_FOUND',
        message: 'Two-factor authentication setup not found',
      },
    });
  });

  it('returns 409 when two-factor authentication is already enabled during verification', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedVerifyTwoFactorSetup.mockRejectedValue(
      new AppError(
        'Two-factor authentication is already enabled',
        409,
        'TWO_FACTOR_ALREADY_ENABLED',
      ),
    );

    const response = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        code: '123456',
      });

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled',
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
      requiresTwoFactor: false,
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

  it('returns 401 when refresh token reuse is detected', async () => {
    mockedRefreshAuth.mockRejectedValue(
      new AppError('Refresh token reuse detected', 401, 'REFRESH_TOKEN_REUSE_DETECTED'),
    );

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=reused-refresh-token');

    expect(response.status).toBe(401);

    expect(mockedRefreshAuth).toHaveBeenCalledWith('reused-refresh-token', {
      userAgent: null,
      ipAddress: '::ffff:127.0.0.1',
    });

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Refresh token reuse detected',
      },
    });
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
      requiresTwoFactor: false,
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
