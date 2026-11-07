import { z } from 'zod';

import { openApiRegistry } from '../../config/openapi.registry.js';

const authUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('AuthUser');

const errorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('AuthError');

const successMessageSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('SuccessMessage');

const authDataSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: authUserSchema,
      accessToken: z.string(),
    }),
  })
  .openapi('AuthDataResponse');

const registerBodySchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
    name: z.string().max(100).optional(),
  })
  .openapi('RegisterRequest');

const loginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(72),
  })
  .openapi('LoginRequest');

const loginResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      data: z.object({
        requiresTwoFactor: z.literal(false),
        user: authUserSchema,
        accessToken: z.string(),
      }),
    }),
    z.object({
      success: z.literal(true),
      data: z.object({
        requiresTwoFactor: z.literal(true),
        challengeToken: z.string(),
        expiresAt: z.string().datetime(),
      }),
    }),
  ])
  .openapi('LoginResponse');

const sessionSchema = z
  .object({
    id: z.string(),
    userAgent: z.string().nullable(),
    ipAddress: z.string().nullable(),
    lastUsedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .openapi('AuthSession');

const sessionsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      sessions: z.array(sessionSchema),
    }),
  })
  .openapi('SessionsResponse');

const revokedSessionsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      revokedSessions: z.number().int(),
    }),
    message: z.string(),
  })
  .openapi('RevokedSessionsResponse');

const createTokenBodySchema = z
  .object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().datetime().optional(),
  })
  .openapi('CreatePersonalAccessTokenRequest');

const createdTokenResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      token: z.string(),
      id: z.string(),
      name: z.string(),
      expiresAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
    }),
  })
  .openapi('CreatedPersonalAccessTokenResponse');

const personalAccessTokenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tokenPrefix: z.string(),
    expiresAt: z.string().datetime().nullable(),
    lastUsedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('PersonalAccessToken');

const tokenListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      tokens: z.array(personalAccessTokenSchema),
    }),
  })
  .openapi('PersonalAccessTokenListResponse');

const setupTwoFactorResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      secret: z.string(),
      provisioningUri: z.string(),
      qrCodeDataUrl: z.string(),
    }),
  })
  .openapi('TwoFactorSetupResponse');

const verifyTwoFactorBodySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .openapi('VerifyTwoFactorRequest');

const verifyTwoFactorResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      recoveryCodes: z.array(z.string()),
    }),
  })
  .openapi('VerifyTwoFactorResponse');

const disableTwoFactorBodySchema = z
  .object({
    password: z.string().min(1),
    code: z.string().regex(/^\d{6}$/),
  })
  .openapi('DisableTwoFactorRequest');

const loginChallengeBodySchema = z
  .object({
    challengeToken: z.string().min(1),
    code: z.string().regex(/^\d{6}$/),
  })
  .openapi('TwoFactorLoginRequest');

const recoveryLoginBodySchema = z
  .object({
    challengeToken: z.string().min(1),
    recoveryCode: z.string().regex(/^[a-fA-F0-9]{32}$/),
  })
  .openapi('TwoFactorRecoveryLoginRequest');

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const commonErrors = {
  400: jsonResponse('Validation error or invalid request.', errorSchema),
  401: jsonResponse('Authentication failed or credentials are invalid.', errorSchema),
  500: jsonResponse('Unexpected server error.', errorSchema),
};

const bearerSecurity = [{ BearerAuth: [] }];

const refreshCookieSecurity = [{ RefreshCookieAuth: [] }];

const bearerAndRefreshCookieSecurity = [
  {
    BearerAuth: [],
    RefreshCookieAuth: [],
  },
];

const registerBody = {
  required: true,
  content: {
    'application/json': {
      schema: registerBodySchema,
    },
  },
};

const loginBody = {
  required: true,
  content: {
    'application/json': {
      schema: loginBodySchema,
    },
  },
};

const createTokenBody = {
  required: true,
  content: {
    'application/json': {
      schema: createTokenBodySchema,
    },
  },
};

// Register
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Authentication'],
  operationId: 'register',
  summary: 'Register a new user',
  description:
    'Creates a user account and starts an authenticated session. The refresh token is set as an HTTP-only cookie.',
  request: {
    body: registerBody,
  },
  responses: {
    201: jsonResponse('User registered successfully.', authDataSchema),
    400: commonErrors[400],
    409: jsonResponse('Username or email is already registered.', errorSchema),
    500: commonErrors[500],
  },
});

// Login
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Authentication'],
  operationId: 'login',
  summary: 'Log in',
  description:
    'Authenticates a user. If two-factor authentication is enabled, returns a challenge token instead of creating a session. Otherwise, sets the refresh token cookie.',
  request: {
    body: loginBody,
  },
  responses: {
    200: jsonResponse('Login result. May require a two-factor challenge.', loginResponseSchema),
    400: commonErrors[400],
    401: jsonResponse('Invalid email or password.', errorSchema),
    500: commonErrors[500],
  },
});

// Logout
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Authentication'],
  operationId: 'logout',
  summary: 'Log out',
  description:
    'Revokes the session associated with the refresh token cookie, if present, and clears the cookie.',
  responses: {
    200: jsonResponse('Logged out successfully.', successMessageSchema),
    500: commonErrors[500],
  },
});

// Refresh
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/refresh',
  tags: ['Authentication'],
  operationId: 'refresh',
  summary: 'Refresh access token',
  description:
    'Uses the refreshToken HTTP-only cookie to rotate the refresh token and issue a new access token.',
  security: refreshCookieSecurity,
  responses: {
    200: jsonResponse('Access token refreshed successfully.', authDataSchema),
    401: jsonResponse(
      'Refresh token is missing, invalid, expired, revoked, or reused.',
      errorSchema,
    ),
    500: commonErrors[500],
  },
});

// Current user
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Authentication'],
  operationId: 'getCurrentUser',
  summary: 'Get current user',
  description: 'Returns the authenticated user profile.',
  security: bearerSecurity,
  responses: {
    200: jsonResponse(
      'Current user retrieved successfully.',
      z.object({
        success: z.literal(true),
        data: z.object({
          user: authUserSchema,
        }),
      }),
    ),
    401: commonErrors[401],
    404: jsonResponse('User not found.', errorSchema),
    500: commonErrors[500],
  },
});

// List sessions
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/auth/sessions',
  tags: ['Sessions'],
  operationId: 'getSessions',
  summary: 'List active sessions',
  description: 'Returns the authenticated user active, non-expired sessions.',
  security: bearerSecurity,
  responses: {
    200: jsonResponse('Active sessions retrieved successfully.', sessionsResponseSchema),
    401: commonErrors[401],
    500: commonErrors[500],
  },
});

// Revoke other sessions
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/auth/sessions',
  tags: ['Sessions'],
  operationId: 'revokeOtherSessions',
  summary: 'Revoke all other sessions',
  description:
    'Revokes all active sessions except the current session. Requires both the access token and refreshToken cookie.',
  security: bearerAndRefreshCookieSecurity,
  responses: {
    200: jsonResponse('Other sessions revoked successfully.', revokedSessionsResponseSchema),
    401: jsonResponse('Authentication or current refresh session is invalid.', errorSchema),
    500: commonErrors[500],
  },
});

// Revoke session
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/auth/sessions/{sessionId}',
  tags: ['Sessions'],
  operationId: 'revokeSession',
  summary: 'Revoke a session',
  description: 'Revokes one active session belonging to the authenticated user.',
  security: bearerSecurity,
  request: {
    params: z.object({
      sessionId: z.string(),
    }),
  },
  responses: {
    200: jsonResponse('Session revoked successfully.', successMessageSchema),
    401: commonErrors[401],
    404: jsonResponse('Session not found.', errorSchema),
    500: commonErrors[500],
  },
});

// Create personal access token
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/tokens',
  tags: ['Tokens'],
  operationId: 'createPersonalAccessToken',
  summary: 'Create a personal access token',
  description:
    'Creates a personal access token. The full token is returned only once and cannot be retrieved later.',
  security: bearerSecurity,
  request: {
    body: createTokenBody,
  },
  responses: {
    201: jsonResponse('Personal access token created successfully.', createdTokenResponseSchema),
    400: commonErrors[400],
    401: commonErrors[401],
    500: commonErrors[500],
  },
});

// List personal access tokens
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/auth/tokens',
  tags: ['Tokens'],
  operationId: 'listPersonalAccessTokens',
  summary: 'List personal access tokens',
  description:
    'Returns the authenticated user personal access tokens. Full token values are not included.',
  security: bearerSecurity,
  responses: {
    200: jsonResponse('Personal access tokens retrieved successfully.', tokenListResponseSchema),
    401: commonErrors[401],
    500: commonErrors[500],
  },
});

// Revoke personal access token
openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/auth/tokens/{tokenId}',
  tags: ['Tokens'],
  operationId: 'revokePersonalAccessToken',
  summary: 'Revoke a personal access token',
  description: 'Deletes a personal access token belonging to the authenticated user.',
  security: bearerSecurity,
  request: {
    params: z.object({
      tokenId: z.string(),
    }),
  },
  responses: {
    200: jsonResponse('Personal access token revoked successfully.', successMessageSchema),
    401: commonErrors[401],
    404: jsonResponse('Personal access token not found.', errorSchema),
    500: commonErrors[500],
  },
});

// Set up two-factor authentication
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/2fa/setup',
  tags: ['Two-Factor Authentication'],
  operationId: 'setupTwoFactorAuthentication',
  summary: 'Set up two-factor authentication',
  description:
    'Generates a TOTP secret, provisioning URI, and QR code. The setup is not enabled until verification succeeds.',
  security: bearerSecurity,
  responses: {
    200: jsonResponse(
      'Two-factor setup data generated successfully.',
      setupTwoFactorResponseSchema,
    ),
    401: commonErrors[401],
    404: jsonResponse('User not found.', errorSchema),
    409: jsonResponse('Two-factor authentication is already enabled.', errorSchema),
    500: commonErrors[500],
  },
});

// Verify two-factor setup
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/2fa/verify',
  tags: ['Two-Factor Authentication'],
  operationId: 'verifyTwoFactorSetup',
  summary: 'Verify and enable two-factor authentication',
  description:
    'Verifies a six-digit TOTP code, enables two-factor authentication, and returns recovery codes. Store the recovery codes securely.',
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: verifyTwoFactorBodySchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Two-factor authentication enabled.', verifyTwoFactorResponseSchema),
    400: commonErrors[400],
    401: jsonResponse('Invalid two-factor authentication code.', errorSchema),
    404: jsonResponse('Two-factor setup not found.', errorSchema),
    409: jsonResponse('Two-factor setup has already been completed.', errorSchema),
    500: commonErrors[500],
  },
});

// Disable two-factor authentication
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/2fa/disable',
  tags: ['Two-Factor Authentication'],
  operationId: 'disableTwoFactorAuthentication',
  summary: 'Disable two-factor authentication',
  description: 'Requires the current password and a valid six-digit TOTP code.',
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: disableTwoFactorBodySchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Two-factor authentication disabled successfully.', successMessageSchema),
    400: commonErrors[400],
    401: jsonResponse('Invalid password or two-factor code.', errorSchema),
    404: jsonResponse('User not found.', errorSchema),
    409: jsonResponse('Two-factor authentication is not enabled.', errorSchema),
    500: commonErrors[500],
  },
});

// Verify two-factor login
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/2fa/login/verify',
  tags: ['Two-Factor Authentication'],
  operationId: 'verifyTwoFactorLogin',
  summary: 'Complete two-factor login',
  description:
    'Verifies a login challenge using a six-digit TOTP code and creates an authenticated session.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: loginChallengeBodySchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Two-factor login completed successfully.', authDataSchema),
    400: commonErrors[400],
    401: jsonResponse('Challenge or two-factor code is invalid or expired.', errorSchema),
    500: commonErrors[500],
  },
});

// Verify recovery code login
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/auth/2fa/login/recovery',
  tags: ['Two-Factor Authentication'],
  operationId: 'verifyTwoFactorRecoveryLogin',
  summary: 'Complete login with a recovery code',
  description: 'Uses a one-time recovery code to complete a two-factor login challenge.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: recoveryLoginBodySchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse('Recovery-code login completed successfully.', authDataSchema),
    400: commonErrors[400],
    401: jsonResponse('Challenge or recovery code is invalid or expired.', errorSchema),
    500: commonErrors[500],
  },
});
