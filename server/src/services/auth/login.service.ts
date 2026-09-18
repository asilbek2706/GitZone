import bcrypt from 'bcrypt';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { LoginInput, LoginResponse, SessionMetadata } from '../../types/auth.types.js';
import { generateTwoFactorChallengeToken } from '../../utils/auth/two-factor/challenge.js';
import { issueAuthSession } from './session-issuer.service.js';

export const loginUser = async (
  input: LoginInput,
  metadata: SessionMetadata,
): Promise<LoginResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      twoFactorAuthentication: {
        select: {
          enabledAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const twoFactorEnabled =
    user.twoFactorAuthentication?.enabledAt !== null &&
    user.twoFactorAuthentication?.enabledAt !== undefined;

  if (twoFactorEnabled) {
    const challenge = generateTwoFactorChallengeToken();

    await prisma.twoFactorChallenge.create({
      data: {
        userId: user.id,
        tokenHash: challenge.tokenHash,
        expiresAt: challenge.expiresAt,
      },
    });

    return {
      requiresTwoFactor: true,
      challengeToken: challenge.token,
      expiresAt: challenge.expiresAt,
    };
  }

  const auth = await issueAuthSession(user, metadata);

  return {
    requiresTwoFactor: false,
    ...auth,
  };
};
