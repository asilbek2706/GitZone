import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { jwtConfig } from '../../config/jwt.js';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface RefreshTokenData {
  token: string;
  tokenHash: string;
  jti: string;
}

export const generateAccessToken = (userId: string): string => {
  const payload: AccessTokenPayload = {
    sub: userId,
    type: 'access',
  };

  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn!,
  });
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateRefreshToken = (userId: string): RefreshTokenData => {
  const jti = crypto.randomUUID();

  const payload: RefreshTokenPayload = {
    sub: userId,
    jti,
    type: 'refresh',
  };

  const token = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn!,
  });

  const tokenHash = hashRefreshToken(token);

  return {
    token,
    tokenHash,
    jti,
  };
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, jwtConfig.accessSecret);

  if (typeof payload === 'string' || payload.type !== 'access' || typeof payload.sub !== 'string') {
    throw new Error('Invalid access token');
  }

  return {
    sub: payload.sub,
    type: 'access',
  };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = jwt.verify(token, jwtConfig.refreshSecret);

  if (
    typeof payload === 'string' ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Invalid refresh token');
  }

  return {
    sub: payload.sub,
    jti: payload.jti,
    type: 'refresh',
  };
};
