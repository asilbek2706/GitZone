import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';

import { authorizeRepositoryAccess } from '../../../src/services/repositories/repository-authorization.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    repository: {
      findUnique: vi.fn(),
    },
  },
}));

const mockedFindUnique = vi.mocked(prisma.repository.findUnique);

describe('authorizeRepositoryAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 when repository does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null as never);

    await expect(authorizeRepositoryAccess('repo-1', 'READ')).rejects.toMatchObject({
      statusCode: 404,
      code: 'REPOSITORY_NOT_FOUND',
    });
  });

  it('allows repository owner to read', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: [],
    } as never);

    const result = await authorizeRepositoryAccess('repo-1', 'READ', 'owner-1');

    expect(result.permission).toBe('OWNER');
  });

  it('allows repository owner to write', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: [],
    } as never);

    const result = await authorizeRepositoryAccess('repo-1', 'WRITE', 'owner-1');

    expect(result.permission).toBe('OWNER');
  });

  it('allows anonymous read for public repository', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: false,
      owner: {
        username: 'asil',
      },
      collaborators: false,
    } as never);

    const result = await authorizeRepositoryAccess('repo-1', 'READ');

    expect(result.permission).toBe('PUBLIC');
  });

  it('allows READ collaborator to read', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: [
        {
          permission: 'READ',
        },
      ],
    } as never);

    const result = await authorizeRepositoryAccess('repo-1', 'READ', 'user-1');

    expect(result.permission).toBe('READ');
  });

  it('denies WRITE access for READ collaborator', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: [
        {
          permission: 'READ',
        },
      ],
    } as never);

    await expect(authorizeRepositoryAccess('repo-1', 'WRITE', 'user-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'REPOSITORY_ACCESS_DENIED',
    });
  });

  it('allows WRITE collaborator to write', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: [
        {
          permission: 'WRITE',
        },
      ],
    } as never);

    const result = await authorizeRepositoryAccess('repo-1', 'WRITE', 'user-1');

    expect(result.permission).toBe('WRITE');
  });

  it('denies anonymous read for private repository', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'repo-1',
      name: 'demo',
      ownerId: 'owner-1',
      isPrivate: true,
      owner: {
        username: 'asil',
      },
      collaborators: false,
    } as never);

    await expect(authorizeRepositoryAccess('repo-1', 'READ')).rejects.toMatchObject({
      statusCode: 403,
      code: 'REPOSITORY_ACCESS_DENIED',
    });
  });
});
