import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { authorizeRepositoryAccess } from './repository-authorization.service.js';

export type RepositoryContentAccess = Awaited<ReturnType<typeof authorizeRepositoryAccess>>;

export const authorizeRepositoryContentRead = async (
  username: string,
  repositoryName: string,
  userId?: string,
): Promise<RepositoryContentAccess> => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repositoryName,

      owner: {
        username,
      },
    },

    select: {
      id: true,
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  try {
    return await authorizeRepositoryAccess(repository.id, 'READ', userId);
  } catch (error) {
    /*
     * Do not reveal existence of private
     * repositories to unauthorized callers.
     */
    if (error instanceof AppError && error.code === 'REPOSITORY_ACCESS_DENIED') {
      throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
    }

    throw error;
  }
};
