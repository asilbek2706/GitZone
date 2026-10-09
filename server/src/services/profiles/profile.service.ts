import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type { PublicUserProfile } from '../../types/profile.types.js';
import type { UpdateProfileInput } from '../../validations/profiles/profile.validation.js';

export const getPublicUserProfile = async (username: string): Promise<PublicUserProfile> => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      location: true,
      website: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
};

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUserProfile> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existingUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
    },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      location: true,
      website: true,
      createdAt: true,
    },
  });
};
