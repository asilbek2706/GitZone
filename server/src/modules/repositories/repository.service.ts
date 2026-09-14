import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import {
  createGitRepository,
  deleteGitRepository,
  renameGitRepository,
} from '../git/git.repository.service.js';
import type { CreateRepositoryInput, UpdateRepositoryInput } from './repository.validation.js';
import type { RepositoryResponse, RepositoryWithOwner } from './repository.types.js';

const toRepositoryResponse = (repository: {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
}): RepositoryResponse => {
  return {
    id: repository.id,
    ownerId: repository.ownerId,
    name: repository.name,
    description: repository.description,
    isPrivate: repository.isPrivate,
    defaultBranch: repository.defaultBranch,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
};

export const createRepository = async (
  ownerId: string,
  input: CreateRepositoryInput,
): Promise<RepositoryResponse> => {
  const existingRepository = await prisma.repository.findUnique({
    where: {
      ownerId_name: {
        ownerId,
        name: input.name,
      },
    },
  });

  if (existingRepository) {
    throw new AppError(
      'Repository with this name already exists',
      409,
      'REPOSITORY_ALREADY_EXISTS',
    );
  }

  const repository = await prisma.repository.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description ?? null,
      isPrivate: input.isPrivate ?? false,
    },
  });

  try {
    const owner = await prisma.user.findUnique({
      where: {
        id: ownerId,
      },
      select: {
        username: true,
      },
    });

    if (!owner) {
      throw new AppError('Repository owner not found', 404, 'USER_NOT_FOUND');
    }

    await createGitRepository(owner.username, repository.name);
  } catch (error) {
    await prisma.repository.delete({
      where: {
        id: repository.id,
      },
    });

    throw error;
  }

  return toRepositoryResponse(repository);
};

export const getUserRepositories = async (username: string): Promise<RepositoryResponse[]> => {
  const repositories = await prisma.repository.findMany({
    where: {
      owner: {
        username,
      },
      isPrivate: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return repositories.map(toRepositoryResponse);
};

export const getRepositoryByUsernameAndName = async (
  username: string,
  name: string,
): Promise<RepositoryWithOwner> => {
  const repository = await prisma.repository.findFirst({
    where: {
      name,
      isPrivate: false,
      owner: {
        username,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  return {
    id: repository.id,
    ownerId: repository.ownerId,
    name: repository.name,
    description: repository.description,
    isPrivate: repository.isPrivate,
    defaultBranch: repository.defaultBranch,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
    owner: repository.owner,
  };
};

export const updateRepository = async (
  ownerId: string,
  username: string,
  name: string,
  input: UpdateRepositoryInput,
): Promise<RepositoryResponse> => {
  const repository = await prisma.repository.findFirst({
    where: {
      name,
      owner: {
        username,
      },
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  if (repository.ownerId !== ownerId) {
    throw new AppError(
      'You do not have permission to modify this repository',
      403,
      'REPOSITORY_FORBIDDEN',
    );
  }

  if (input.name && input.name !== repository.name) {
    const existingRepository = await prisma.repository.findUnique({
      where: {
        ownerId_name: {
          ownerId,
          name: input.name,
        },
      },
    });

    if (existingRepository) {
      throw new AppError(
        'Repository with this name already exists',
        409,
        'REPOSITORY_ALREADY_EXISTS',
      );
    }

    await renameGitRepository(username, repository.name, input.name);
  }

  const updatedRepository = await prisma.repository.update({
    where: {
      id: repository.id,
    },
    data: {
      ...(input.name !== undefined && {
        name: input.name,
      }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.isPrivate !== undefined && {
        isPrivate: input.isPrivate,
      }),
    },
  });

  return toRepositoryResponse(updatedRepository);
};

export const deleteRepository = async (
  ownerId: string,
  username: string,
  name: string,
): Promise<void> => {
  const repository = await prisma.repository.findFirst({
    where: {
      name,
      owner: {
        username,
      },
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  if (repository.ownerId !== ownerId) {
    throw new AppError(
      'You do not have permission to delete this repository',
      403,
      'REPOSITORY_FORBIDDEN',
    );
  }

  await deleteGitRepository(username, repository.name);

  await prisma.repository.delete({
    where: {
      id: repository.id,
    },
  });
};
