import bcrypt from 'bcrypt';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from './auth.tokens.js';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from './auth.types.js';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

const toAuthUser = (user: {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getRefreshTokenExpiresAt = (): Date => {
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);

  return expiresAt;
};

export const registerUser = async (input: RegisterInput): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.username }, { email: input.email }],
    },
  });

  if (existingUser) {
    if (existingUser.username === input.username) {
      throw new AppError('Username is already taken', 409, 'USERNAME_TAKEN');
    }

    throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      password: hashedPassword,
      name: input.name ?? null,
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshToken.tokenHash,
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshToken.tokenHash,
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
};

export const refreshAuth = async (refreshToken: string): Promise<AuthResponse> => {
  const payload = verifyRefreshToken(refreshToken);

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: {
      refreshTokenHash,
    },
  });

  if (!session) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (session.revokedAt !== null) {
    throw new AppError('Refresh token has been revoked', 401, 'REFRESH_TOKEN_REVOKED');
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  if (session.userId !== payload.sub) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 401, 'USER_NOT_FOUND');
  }

  const accessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.$transaction([
    prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    }),

    prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: newRefreshToken.tokenHash,
        expiresAt: getRefreshTokenExpiresAt(),
      },
    }),
  ]);

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken: newRefreshToken.token,
  };
};

export const getCurrentUser = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return toAuthUser(user);
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
