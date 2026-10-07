import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { authorizeRepositoryAccess } from './repository-authorization.service.js';

export const authorizeRepositoryBranchWrite = async (
  username: string,
  repositoryName: string,
  userId: string,
) => {
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

  return authorizeRepositoryAccess(repository.id, 'WRITE', userId);
};
