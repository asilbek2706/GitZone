import bcrypt from 'bcrypt';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { AuthResponse, RegisterInput, SessionMetadata } from '../../types/auth.types.js';
import { issueAuthSession } from './session-issuer.service.js';

const SALT_ROUNDS = 12;

export const registerUser = async (
  input: RegisterInput,
  metadata: SessionMetadata,
): Promise<AuthResponse> => {
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

  return issueAuthSession(user, metadata);
};
