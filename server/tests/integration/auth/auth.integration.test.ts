import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';
import { disableTwoFactorAuthentication } from '../../../src/services/auth/two-factor/disable.service.js';
import { verifyTwoFactorLoginChallenge } from '../../../src/services/auth/two-factor/login-challenge.service.js';
import { verifyTwoFactorRecoveryLogin } from '../../../src/services/auth/two-factor/recovery-login.service.js';
import { setupTwoFactorAuthentication } from '../../../src/services/auth/two-factor/setup.service.js';
import { verifyTwoFactorSetup } from '../../../src/services/auth/two-factor/verify.service.js';

import { getCurrentUser } from '../../../src/services/auth/current-user.service.js';
import { loginUser } from '../../../src/services/auth/login.service.js';
import { logoutUser } from '../../../src/services/auth/logout.service.js';
import { refreshAuth } from '../../../src/services/auth/refresh.service.js';
import { registerUser } from '../../../src/services/auth/register.service.js';
import {
  getActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from '../../../src/services/auth/session.service.js';

import { verifyAccessToken } from '../../../src/utils/auth/tokens.js';

import {
  getPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../../../src/services/auth/pat.service.js';

vi.mock('../../../src/services/auth/register.service.js', () => ({
  registerUser: vi.fn(),
}));

vi.mock('../../../src/services/auth/login.service.js', () => ({
  loginUser: vi.fn(),
}));

vi.mock('../../../src/services/auth/refresh.service.js', () => ({
  refreshAuth: vi.fn(),
}));

vi.mock('../../../src/services/auth/current-user.service.js', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../../../src/services/auth/session.service.js', () => ({
  getActiveSessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock('../../../src/services/auth/logout.service.js', () => ({
  logoutUser: vi.fn(),
}));

vi.mock('../../../src/services/auth/pat.service.js', () => ({
  createPersonalAccessToken: vi.fn(),
  getPersonalAccessTokens: vi.fn(),
  revokePersonalAccessToken: vi.fn(),
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/services/auth/two-factor/disable.service.js', () => ({
  disableTwoFactorAuthentication: vi.fn(),
}));

vi.mock('../../../src/services/auth/two-factor/login-challenge.service.js', () => ({
  verifyTwoFactorLoginChallenge: vi.fn(),
}));

vi.mock('../../../src/services/auth/two-factor/recovery-login.service.js', () => ({
  verifyTwoFactorRecoveryLogin: vi.fn(),
}));

vi.mock('../../../src/services/auth/two-factor/setup.service.js', () => ({
  setupTwoFactorAuthentication: vi.fn(),
}));

vi.mock('../../../src/services/auth/two-factor/verify.service.js', () => ({
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

const mockedDisableTwoFactorAuthentication = vi.mocked(disableTwoFactorAuthentication);
const mockedVerifyTwoFactorLoginChallenge = vi.mocked(verifyTwoFactorLoginChallenge);
const mockedVerifyTwoFactorRecoveryLogin = vi.mocked(verifyTwoFactorRecoveryLogin);
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

  it('verifies a two-factor login challenge without prior authentication', async () => {
    mockedVerifyTwoFactorLoginChallenge.mockResolvedValue({
      user,
      accessToken: 'two-factor-access-token',
      refreshToken: 'two-factor-refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/2fa/login/verify')
      .set('User-Agent', 'GitZone-2FA-Test/1.0')
      .send({
        challengeToken: 'challenge-token',
        code: '123456',
      });

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();

    expect(mockedVerifyTwoFactorLoginChallenge).toHaveBeenCalledWith('challenge-token', '123456', {
      userAgent: 'GitZone-2FA-Test/1.0',
      ipAddress: '::ffff:127.0.0.1',
    });

    expect(response.body).toEqual({
      success: true,
      data: {
        user: {
          ...user,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
        accessToken: 'two-factor-access-token',
      },
    });

    expect(response.body.data).not.toHaveProperty('refreshToken');

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies?.[0]).toContain('refreshToken=two-factor-refresh-token');
    expect(cookies?.[0]).toContain('HttpOnly');
    expect(cookies?.[0]).toContain('Path=/api/auth');
    expect(cookies?.[0]).toContain('SameSite=Lax');
  });

  it('rejects malformed two-factor login challenge payload', async () => {
    const response = await request(app).post('/api/auth/2fa/login/verify').send({
      challengeToken: '',
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

    expect(mockedVerifyTwoFactorLoginChallenge).not.toHaveBeenCalled();
  });

  it('rejects non-numeric two-factor login code', async () => {
    const response = await request(app).post('/api/auth/2fa/login/verify').send({
      challengeToken: 'challenge-token',
      code: '12AB56',
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    });

    expect(mockedVerifyTwoFactorLoginChallenge).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid or expired two-factor login challenge', async () => {
    mockedVerifyTwoFactorLoginChallenge.mockRejectedValue(
      new AppError(
        'Invalid or expired two-factor authentication challenge',
        401,
        'INVALID_TWO_FACTOR_CHALLENGE',
      ),
    );

    const response = await request(app).post('/api/auth/2fa/login/verify').send({
      challengeToken: 'invalid-challenge-token',
      code: '123456',
    });

    expect(response.status).toBe(401);

    expect(mockedVerifyTwoFactorLoginChallenge).toHaveBeenCalledWith(
      'invalid-challenge-token',
      '123456',
      {
        userAgent: null,
        ipAddress: '::ffff:127.0.0.1',
      },
    );

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_TWO_FACTOR_CHALLENGE',
        message: 'Invalid or expired two-factor authentication challenge',
      },
    });
  });

  it('returns 401 for an invalid two-factor login code', async () => {
    mockedVerifyTwoFactorLoginChallenge.mockRejectedValue(
      new AppError('Invalid two-factor authentication code', 401, 'INVALID_TWO_FACTOR_CODE'),
    );

    const response = await request(app).post('/api/auth/2fa/login/verify').send({
      challengeToken: 'challenge-token',
      code: '000000',
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

  it('logs in with a recovery code without prior authentication', async () => {
    mockedVerifyTwoFactorRecoveryLogin.mockResolvedValue({
      user,
      accessToken: 'recovery-access-token',
      refreshToken: 'recovery-refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/2fa/login/recovery')
      .set('User-Agent', 'GitZone-Recovery-Test/1.0')
      .send({
        challengeToken: 'challenge-token',
        recoveryCode: '0123456789abcdef0123456789abcdef',
      });

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();

    expect(mockedVerifyTwoFactorRecoveryLogin).toHaveBeenCalledWith(
      'challenge-token',
      '0123456789abcdef0123456789abcdef',
      {
        userAgent: 'GitZone-Recovery-Test/1.0',
        ipAddress: '::ffff:127.0.0.1',
      },
    );

    expect(response.body).toEqual({
      success: true,
      data: {
        user: {
          ...user,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
        accessToken: 'recovery-access-token',
      },
    });

    expect(response.body.data).not.toHaveProperty('refreshToken');

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies?.[0]).toContain('refreshToken=recovery-refresh-token');
    expect(cookies?.[0]).toContain('HttpOnly');
    expect(cookies?.[0]).toContain('Path=/api/auth');
    expect(cookies?.[0]).toContain('SameSite=Lax');
  });

  it('rejects malformed recovery login payload', async () => {
    const response = await request(app).post('/api/auth/2fa/login/recovery').send({
      challengeToken: '',
      recoveryCode: 'invalid',
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    });

    expect(mockedVerifyTwoFactorRecoveryLogin).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid recovery login challenge', async () => {
    mockedVerifyTwoFactorRecoveryLogin.mockRejectedValue(
      new AppError(
        'Invalid or expired two-factor authentication challenge',
        401,
        'INVALID_TWO_FACTOR_CHALLENGE',
      ),
    );

    const response = await request(app).post('/api/auth/2fa/login/recovery').send({
      challengeToken: 'invalid-challenge-token',
      recoveryCode: '0123456789abcdef0123456789abcdef',
    });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_TWO_FACTOR_CHALLENGE',
        message: 'Invalid or expired two-factor authentication challenge',
      },
    });
  });

  it('returns 401 for an invalid recovery code', async () => {
    mockedVerifyTwoFactorRecoveryLogin.mockRejectedValue(
      new AppError('Invalid recovery code', 401, 'INVALID_RECOVERY_CODE'),
    );

    const response = await request(app).post('/api/auth/2fa/login/recovery').send({
      challengeToken: 'challenge-token',
      recoveryCode: 'ffffffffffffffffffffffffffffffff',
    });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_RECOVERY_CODE',
        message: 'Invalid recovery code',
      },
    });
  });


  it('disables two-factor authentication for an authenticated user', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedDisableTwoFactorAuthentication.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        password: 'CurrentPassword123!',
        code: '123456',
      });

    expect(response.status).toBe(200);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

    expect(mockedDisableTwoFactorAuthentication).toHaveBeenCalledWith(
      'user-1',
      'CurrentPassword123!',
      '123456',
    );

    expect(response.body).toEqual({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  });

  it('rejects two-factor disable without authentication', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .send({
        password: 'CurrentPassword123!',
        code: '123456',
      });

    expect(response.status).toBe(401);
    expect(mockedDisableTwoFactorAuthentication).not.toHaveBeenCalled();
  });

  it('rejects malformed two-factor disable payload', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        password: '',
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

    expect(mockedDisableTwoFactorAuthentication).not.toHaveBeenCalled();
  });

  it('returns 401 when the current password is invalid during two-factor disable', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedDisableTwoFactorAuthentication.mockRejectedValue(
      new AppError('Invalid current password', 401, 'INVALID_CURRENT_PASSWORD'),
    );

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        password: 'WrongPassword123!',
        code: '123456',
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Invalid current password',
      },
    });
  });

  it('returns 401 when the two-factor code is invalid during disable', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedDisableTwoFactorAuthentication.mockRejectedValue(
      new AppError(
        'Invalid two-factor authentication code',
        401,
        'INVALID_TWO_FACTOR_CODE',
      ),
    );

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        password: 'CurrentPassword123!',
        code: '000000',
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

  it('returns 409 when two-factor authentication is not enabled during disable', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedDisableTwoFactorAuthentication.mockRejectedValue(
      new AppError(
        'Two-factor authentication is not enabled',
        409,
        'TWO_FACTOR_NOT_ENABLED',
      ),
    );

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', 'Bearer test-access-token')
      .send({
        password: 'CurrentPassword123!',
        code: '123456',
      });

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
  });

});
