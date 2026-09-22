import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../../src/generated/prisma/client.js';

import prisma from '../../../src/config/prisma.js';

import {
  addRepositoryCollaborator,
  getRepositoryCollaborators,
  removeRepositoryCollaborator,
  updateRepositoryCollaborator,
} from '../../../src/services/repositories/repository-collaborator.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    repository: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    repositoryCollaborator: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockedRepositoryFindFirst = vi.mocked(prisma.repository.findFirst);

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockedCollaboratorFindUnique = vi.mocked(prisma.repositoryCollaborator.findUnique);

const mockedCollaboratorFindMany = vi.mocked(prisma.repositoryCollaborator.findMany);

const mockedCollaboratorCreate = vi.mocked(prisma.repositoryCollaborator.create);

const mockedCollaboratorUpdate = vi.mocked(prisma.repositoryCollaborator.update);

const mockedCollaboratorDelete = vi.mocked(prisma.repositoryCollaborator.delete);

describe('repository collaborator service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 when repository does not exist', async () => {
    mockedRepositoryFindFirst.mockResolvedValue(null as never);

    await expect(getRepositoryCollaborators('owner-1', 'asil', 'demo')).rejects.toMatchObject({
      statusCode: 404,
      code: 'REPOSITORY_NOT_FOUND',
    });
  });

  it('denies collaborator management for non-owner', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    await expect(getRepositoryCollaborators('user-2', 'asil', 'demo')).rejects.toMatchObject({
      statusCode: 403,
      code: 'REPOSITORY_FORBIDDEN',
    });
  });

  it('adds repository collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
      username: 'testuser',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue(null as never);

    mockedCollaboratorCreate.mockResolvedValue({
      id: 'collab-1',
      permission: 'READ',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-2',
        username: 'testuser',
        name: 'Test User',
        avatarUrl: null,
      },
    } as never);

    const result = await addRepositoryCollaborator('owner-1', 'asil', 'demo', 'testuser', 'READ');

    expect(result.permission).toBe('READ');
    expect(result.user.username).toBe('testuser');

    expect(mockedCollaboratorCreate).toHaveBeenCalledOnce();
  });

  it('rejects missing collaborator user', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(
      addRepositoryCollaborator('owner-1', 'asil', 'demo', 'missing-user', 'READ'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'COLLABORATOR_USER_NOT_FOUND',
    });
  });

  it('rejects repository owner as collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'owner-1',
      username: 'asil',
    } as never);

    await expect(
      addRepositoryCollaborator('owner-1', 'asil', 'demo', 'asil', 'READ'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'OWNER_CANNOT_BE_COLLABORATOR',
    });
  });

  it('rejects duplicate collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
      username: 'testuser',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue({
      id: 'collab-1',
    } as never);

    await expect(
      addRepositoryCollaborator('owner-1', 'asil', 'demo', 'testuser', 'READ'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'COLLABORATOR_ALREADY_EXISTS',
    });
  });

  it('lists repository collaborators', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedCollaboratorFindMany.mockResolvedValue([
      {
        id: 'collab-1',
        permission: 'READ',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-2',
          username: 'testuser',
          name: 'Test User',
          avatarUrl: null,
        },
      },
    ] as never);

    const result = await getRepositoryCollaborators('owner-1', 'asil', 'demo');

    expect(result).toHaveLength(1);
    expect(result[0]?.user.username).toBe('testuser');
  });

  it('updates collaborator permission', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue({
      id: 'collab-1',
    } as never);

    mockedCollaboratorUpdate.mockResolvedValue({
      id: 'collab-1',
      permission: 'WRITE',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-2',
        username: 'testuser',
        name: 'Test User',
        avatarUrl: null,
      },
    } as never);

    const result = await updateRepositoryCollaborator(
      'owner-1',
      'asil',
      'demo',
      'testuser',
      'WRITE',
    );

    expect(result.permission).toBe('WRITE');

    expect(mockedCollaboratorUpdate).toHaveBeenCalledOnce();
  });

  it('throws 404 when updating missing collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue(null as never);

    await expect(
      updateRepositoryCollaborator('owner-1', 'asil', 'demo', 'testuser', 'WRITE'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'COLLABORATOR_NOT_FOUND',
    });
  });

  it('removes collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue({
      id: 'collab-1',
    } as never);

    mockedCollaboratorDelete.mockResolvedValue({
      id: 'collab-1',
    } as never);

    await expect(
      removeRepositoryCollaborator('owner-1', 'asil', 'demo', 'testuser'),
    ).resolves.toBeUndefined();

    expect(mockedCollaboratorDelete).toHaveBeenCalledOnce();
  });

  it('throws 404 when removing missing collaborator', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue(null as never);

    await expect(
      removeRepositoryCollaborator('owner-1', 'asil', 'demo', 'testuser'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'COLLABORATOR_NOT_FOUND',
    });
  });

  it('maps a concurrent duplicate collaborator insert to 409', async () => {
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
    } as never);

    mockedUserFindUnique.mockResolvedValue({
      id: 'user-2',
      username: 'testuser',
    } as never);

    mockedCollaboratorFindUnique.mockResolvedValue(null as never);

    mockedCollaboratorCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.10.0',
        },
      ),
    );

    await expect(
      addRepositoryCollaborator(
        'owner-1',
        'asil',
        'demo',
        'testuser',
        'READ',
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'COLLABORATOR_ALREADY_EXISTS',
    });
  });

});
