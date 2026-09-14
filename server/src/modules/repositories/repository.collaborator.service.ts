import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';

export type RepositoryCollaboratorPermission = 'READ' | 'WRITE';

type RepositoryCollaboratorResponse = {
  id: string;
  permission: RepositoryCollaboratorPermission;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

const getOwnedRepository = async (ownerId: string, username: string, repositoryName: string) => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repositoryName,
      owner: {
        username,
      },
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  if (repository.ownerId !== ownerId) {
    throw new AppError(
      'You do not have permission to manage collaborators for this repository',
      403,
      'REPOSITORY_FORBIDDEN',
    );
  }

  return repository;
};

export const addRepositoryCollaborator = async (
  ownerId: string,
  username: string,
  repositoryName: string,
  collaboratorUsername: string,
  permission: RepositoryCollaboratorPermission,
): Promise<RepositoryCollaboratorResponse> => {
  const repository = await getOwnedRepository(ownerId, username, repositoryName);

  const collaboratorUser = await prisma.user.findUnique({
    where: {
      username: collaboratorUsername,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!collaboratorUser) {
    throw new AppError('Collaborator user not found', 404, 'COLLABORATOR_USER_NOT_FOUND');
  }

  if (collaboratorUser.id === repository.ownerId) {
    throw new AppError(
      'Repository owner cannot be added as a collaborator',
      400,
      'OWNER_CANNOT_BE_COLLABORATOR',
    );
  }

  const existingCollaborator = await prisma.repositoryCollaborator.findUnique({
    where: {
      repositoryId_userId: {
        repositoryId: repository.id,
        userId: collaboratorUser.id,
      },
    },
  });

  if (existingCollaborator) {
    throw new AppError('User is already a collaborator', 409, 'COLLABORATOR_ALREADY_EXISTS');
  }

  const collaborator = await prisma.repositoryCollaborator.create({
    data: {
      repositoryId: repository.id,
      userId: collaboratorUser.id,
      permission,
    },
    select: {
      id: true,
      permission: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  return collaborator;
};

export const getRepositoryCollaborators = async (
  ownerId: string,
  username: string,
  repositoryName: string,
): Promise<RepositoryCollaboratorResponse[]> => {
  const repository = await getOwnedRepository(ownerId, username, repositoryName);

  const collaborators = await prisma.repositoryCollaborator.findMany({
    where: {
      repositoryId: repository.id,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      permission: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  return collaborators;
};

export const updateRepositoryCollaborator = async (
  ownerId: string,
  username: string,
  repositoryName: string,
  collaboratorUsername: string,
  permission: RepositoryCollaboratorPermission,
): Promise<RepositoryCollaboratorResponse> => {
  const repository = await getOwnedRepository(ownerId, username, repositoryName);

  const collaboratorUser = await prisma.user.findUnique({
    where: {
      username: collaboratorUsername,
    },
    select: {
      id: true,
    },
  });

  if (!collaboratorUser) {
    throw new AppError('Collaborator user not found', 404, 'COLLABORATOR_USER_NOT_FOUND');
  }

  const existingCollaborator = await prisma.repositoryCollaborator.findUnique({
    where: {
      repositoryId_userId: {
        repositoryId: repository.id,
        userId: collaboratorUser.id,
      },
    },
  });

  if (!existingCollaborator) {
    throw new AppError('Repository collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');
  }

  const collaborator = await prisma.repositoryCollaborator.update({
    where: {
      id: existingCollaborator.id,
    },
    data: {
      permission,
    },
    select: {
      id: true,
      permission: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  return collaborator;
};

export const removeRepositoryCollaborator = async (
  ownerId: string,
  username: string,
  repositoryName: string,
  collaboratorUsername: string,
): Promise<void> => {
  const repository = await getOwnedRepository(ownerId, username, repositoryName);

  const collaboratorUser = await prisma.user.findUnique({
    where: {
      username: collaboratorUsername,
    },
    select: {
      id: true,
    },
  });

  if (!collaboratorUser) {
    throw new AppError('Collaborator user not found', 404, 'COLLABORATOR_USER_NOT_FOUND');
  }

  const collaborator = await prisma.repositoryCollaborator.findUnique({
    where: {
      repositoryId_userId: {
        repositoryId: repository.id,
        userId: collaboratorUser.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!collaborator) {
    throw new AppError('Repository collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');
  }

  await prisma.repositoryCollaborator.delete({
    where: {
      id: collaborator.id,
    },
  });
};
