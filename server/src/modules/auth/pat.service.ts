import crypto from 'node:crypto';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';

const PAT_PREFIX = 'gzp_';
const TOKEN_BYTES = 32;

const hashPersonalAccessToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const isTokenHashEqual = (storedHash: string, providedHash: string): boolean => {
  const storedHashBuffer = Buffer.from(storedHash, 'hex');
  const providedHashBuffer = Buffer.from(providedHash, 'hex');

  if (storedHashBuffer.length !== providedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedHashBuffer, providedHashBuffer);
};

const generatePersonalAccessToken = (): string => {
  const randomToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');

  return `${PAT_PREFIX}${randomToken}`;
};

export const createPersonalAccessToken = async (
  userId: string,
  name: string,
  expiresAt?: Date | null,
): Promise<{
  id: string;
  name: string;
  token: string;
  expiresAt: Date | null;
  createdAt: Date;
}> => {
  const token = generatePersonalAccessToken();

  const tokenPrefix = token.slice(0, 12);

  const tokenHash = hashPersonalAccessToken(token);

  const personalAccessToken = await prisma.personalAccessToken.create({
    data: {
      userId,
      name,
      tokenPrefix,
      tokenHash,
      expiresAt: expiresAt ?? null,
    },
  });

  return {
    id: personalAccessToken.id,
    name: personalAccessToken.name,
    token,
    expiresAt: personalAccessToken.expiresAt,
    createdAt: personalAccessToken.createdAt,
  };
};

export const verifyPersonalAccessToken = async (
  username: string,
  token: string,
): Promise<{
  userId: string;
  username: string;
}> => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid username or personal access token', 401, 'INVALID_GIT_CREDENTIALS');
  }

  const tokenPrefix = token.slice(0, 12);

  const personalAccessToken = await prisma.personalAccessToken.findUnique({
    where: {
      tokenPrefix,
    },
  });

  if (!personalAccessToken) {
    throw new AppError('Invalid username or personal access token', 401, 'INVALID_GIT_CREDENTIALS');
  }

  const tokenHash = hashPersonalAccessToken(token);

  if (!isTokenHashEqual(personalAccessToken.tokenHash, tokenHash)) {
    throw new AppError('Invalid username or personal access token', 401, 'INVALID_GIT_CREDENTIALS');
  }

  if (personalAccessToken.userId !== user.id) {
    throw new AppError('Invalid username or personal access token', 401, 'INVALID_GIT_CREDENTIALS');
  }

  if (personalAccessToken.expiresAt !== null && personalAccessToken.expiresAt <= new Date()) {
    throw new AppError('Personal access token has expired', 401, 'GIT_TOKEN_EXPIRED');
  }

  await prisma.personalAccessToken.update({
    where: {
      id: personalAccessToken.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    userId: user.id,
    username: user.username,
  };
};

export const getPersonalAccessTokens = async (
  userId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    tokenPrefix: string;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
  }>
> => {
  return prisma.personalAccessToken.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const revokePersonalAccessToken = async (userId: string, tokenId: string): Promise<void> => {
  const result = await prisma.personalAccessToken.deleteMany({
    where: {
      id: tokenId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new AppError('Personal access token not found', 404, 'PERSONAL_ACCESS_TOKEN_NOT_FOUND');
  }
};
