import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { isPrismaUniqueConstraintError } from '../../utils/prisma/errors.js';
import { authorizeRepositoryAccess } from '../repositories/repository-authorization.service.js';

import type {
  CreateLabelInput,
  UpdateLabelInput,
} from '../../validations/labels/label.validation.js';

type Access = 'READ' | 'WRITE';

const resolveRepository = async (
  username: string,
  repositoryName: string,
  userId: string | undefined,
  access: Access,
) => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repositoryName,
      owner: { username },
    },
    select: { id: true },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  await authorizeRepositoryAccess(repository.id, access, userId);

  return repository;
};

const resolveLabel = async (repositoryId: string, labelId: string) => {
  const label = await prisma.label.findFirst({
    where: {
      id: labelId,
      repositoryId,
    },
  });

  if (!label) {
    throw new AppError('Label not found', 404, 'LABEL_NOT_FOUND');
  }

  return label;
};

const handleLabelError = (error: unknown): never => {
  if (isPrismaUniqueConstraintError(error)) {
    throw new AppError('A label with this name already exists', 409, 'LABEL_ALREADY_EXISTS');
  }

  throw error;
};

export const createLabel = async (
  userId: string,
  username: string,
  repositoryName: string,
  input: CreateLabelInput,
) => {
  const repository = await resolveRepository(username, repositoryName, userId, 'WRITE');

  try {
    return await prisma.label.create({
      data: {
        repositoryId: repository.id,
        name: input.name,
        color: input.color,
        description: input.description ?? null,
      },
    });
  } catch (error) {
    return handleLabelError(error);
  }
};

export const listLabels = async (username: string, repositoryName: string, userId?: string) => {
  const repository = await resolveRepository(username, repositoryName, userId, 'READ');

  return prisma.label.findMany({
    where: {
      repositoryId: repository.id,
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
};

export const getLabel = async (
  username: string,
  repositoryName: string,
  labelId: string,
  userId?: string,
) => {
  const repository = await resolveRepository(username, repositoryName, userId, 'READ');

  return resolveLabel(repository.id, labelId);
};

export const updateLabel = async (
  userId: string,
  username: string,
  repositoryName: string,
  labelId: string,
  input: UpdateLabelInput,
) => {
  const repository = await resolveRepository(username, repositoryName, userId, 'WRITE');

  await resolveLabel(repository.id, labelId);

  try {
    return await prisma.label.update({
      where: {
        id: labelId,
        repositoryId: repository.id,
      },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    });
  } catch (error) {
    return handleLabelError(error);
  }
};

export const deleteLabel = async (
  userId: string,
  username: string,
  repositoryName: string,
  labelId: string,
) => {
  const repository = await resolveRepository(username, repositoryName, userId, 'WRITE');

  await resolveLabel(repository.id, labelId);

  await prisma.label.delete({
    where: {
      id: labelId,
      repositoryId: repository.id,
    },
  });
};
