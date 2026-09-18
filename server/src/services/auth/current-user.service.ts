import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { AuthUser } from '../../types/auth.types.js';
import { toAuthUser } from './session-issuer.service.js';

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
