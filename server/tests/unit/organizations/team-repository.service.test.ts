import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedOrganizationFindUnique,
  mockedOrganizationMemberFindUnique,
  mockedTeamFindFirst,
  mockedRepositoryFindFirst,
  mockedTeamRepositoryFindUnique,
  mockedTeamRepositoryFindMany,
  mockedTeamRepositoryCreate,
  mockedTeamRepositoryUpdate,
  mockedTeamRepositoryDelete,
} = vi.hoisted(() => ({
  mockedOrganizationFindUnique: vi.fn(),
  mockedOrganizationMemberFindUnique: vi.fn(),
  mockedTeamFindFirst: vi.fn(),
  mockedRepositoryFindFirst: vi.fn(),
  mockedTeamRepositoryFindUnique: vi.fn(),
  mockedTeamRepositoryFindMany: vi.fn(),
  mockedTeamRepositoryCreate: vi.fn(),
  mockedTeamRepositoryUpdate: vi.fn(),
  mockedTeamRepositoryDelete: vi.fn(),
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    organization: {
      findUnique: mockedOrganizationFindUnique,
    },
    organizationMember: {
      findUnique: mockedOrganizationMemberFindUnique,
    },
    team: {
      findFirst: mockedTeamFindFirst,
    },
    repository: {
      findFirst: mockedRepositoryFindFirst,
    },
    teamRepository: {
      findUnique: mockedTeamRepositoryFindUnique,
      findMany: mockedTeamRepositoryFindMany,
      create: mockedTeamRepositoryCreate,
      update: mockedTeamRepositoryUpdate,
      delete: mockedTeamRepositoryDelete,
    },
  },
}));

const {
  addTeamRepository,
  getTeamRepositories,
  updateTeamRepository,
  removeTeamRepository,
} = await import('../../../src/services/organizations/team-repository.service.js');

const addInput = {
  repositoryId: 'repo-1',
  permission: 'WRITE' as const,
};

const updateInput = {
  permission: 'READ' as const,
};

describe('Team repository service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedOrganizationFindUnique.mockResolvedValue({ id: 'org-1' });
    mockedOrganizationMemberFindUnique.mockResolvedValue({ role: 'OWNER' });
    mockedTeamFindFirst.mockResolvedValue({
      id: 'team-1',
      organizationId: 'org-1',
      name: 'Frontend Team',
      slug: 'frontend-team',
    });
    mockedRepositoryFindFirst.mockResolvedValue({
      id: 'repo-1',
      name: 'frontend',
      organizationId: 'org-1',
    });
    mockedTeamRepositoryFindUnique.mockResolvedValue(null);
    mockedTeamRepositoryFindMany.mockResolvedValue([]);
    mockedTeamRepositoryCreate.mockResolvedValue({
      id: 'access-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      permission: 'WRITE',
      createdAt: new Date('2026-10-21T00:00:00.000Z'),
      updatedAt: new Date('2026-10-21T00:00:00.000Z'),
    });
    mockedTeamRepositoryUpdate.mockResolvedValue({
      id: 'access-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      permission: 'READ',
      createdAt: new Date('2026-10-21T00:00:00.000Z'),
      updatedAt: new Date('2026-10-21T00:00:00.000Z'),
    });
  });

  it('adds repository access when the actor is the organization owner', async () => {
    const result = await addTeamRepository(
      'gitzone-platform',
      'team-1',
      'user-1',
      addInput,
    );

    expect(result).toMatchObject({
      id: 'access-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      permission: 'WRITE',
    });

    expect(mockedTeamRepositoryCreate).toHaveBeenCalledWith({
      data: {
        teamId: 'team-1',
        repositoryId: 'repo-1',
        permission: 'WRITE',
      },
      select: {
        id: true,
        teamId: true,
        repositoryId: true,
        permission: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects access management when the organization does not exist', async () => {
    mockedOrganizationFindUnique.mockResolvedValueOnce(null);

    await expect(
      addTeamRepository('missing-org', 'team-1', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORGANIZATION_NOT_FOUND',
    });

    expect(mockedOrganizationMemberFindUnique).not.toHaveBeenCalled();
    expect(mockedTeamRepositoryCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['a regular member', { role: 'MEMBER' }],
    ['a user who is not a member', null],
  ])('rejects access management for %s', async (_description, membership) => {
    mockedOrganizationMemberFindUnique.mockResolvedValueOnce(membership);

    await expect(
      addTeamRepository('gitzone-platform', 'team-1', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORGANIZATION_OWNER_REQUIRED',
    });

    expect(mockedTeamRepositoryCreate).not.toHaveBeenCalled();
  });

  it('rejects access to a team outside the organization', async () => {
    mockedTeamFindFirst.mockResolvedValueOnce(null);

    await expect(
      addTeamRepository('gitzone-platform', 'foreign-team', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_NOT_FOUND',
    });

    expect(mockedRepositoryFindFirst).not.toHaveBeenCalled();
    expect(mockedTeamRepositoryCreate).not.toHaveBeenCalled();
  });

  it('rejects access to a repository outside the organization', async () => {
    mockedRepositoryFindFirst.mockResolvedValueOnce(null);

    await expect(
      addTeamRepository('gitzone-platform', 'team-1', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORGANIZATION_REPOSITORY_NOT_FOUND',
    });

    expect(mockedTeamRepositoryCreate).not.toHaveBeenCalled();
  });

  it('rejects duplicate team repository access', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce({ id: 'access-1' });

    await expect(
      addTeamRepository('gitzone-platform', 'team-1', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS',
    });

    expect(mockedTeamRepositoryCreate).not.toHaveBeenCalled();
  });

  it('maps concurrent duplicate access creation to a conflict error', async () => {
    const duplicateError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });

    mockedTeamRepositoryCreate.mockRejectedValueOnce(duplicateError);

    await expect(
      addTeamRepository('gitzone-platform', 'team-1', 'user-1', addInput),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS',
    });
  });

  it('lists repositories assigned to a team', async () => {
    const access = {
      id: 'access-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      permission: 'READ',
      createdAt: new Date('2026-10-21T00:00:00.000Z'),
      updatedAt: new Date('2026-10-21T00:00:00.000Z'),
      repository: {
        id: 'repo-1',
        name: 'frontend',
        description: 'Frontend repository',
        isPrivate: true,
      },
    };

    mockedTeamRepositoryFindMany.mockResolvedValueOnce([access]);

    const result = await getTeamRepositories(
      'gitzone-platform',
      'team-1',
      'user-1',
    );

    expect(result).toEqual([access]);
    expect(mockedTeamRepositoryFindMany).toHaveBeenCalledWith({
      where: {
        teamId: 'team-1',
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        teamId: true,
        repositoryId: true,
        permission: true,
        createdAt: true,
        updatedAt: true,
        repository: {
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
          },
        },
      },
    });
  });

  it('updates an existing team repository permission', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce({ id: 'access-1' });

    const result = await updateTeamRepository(
      'gitzone-platform',
      'team-1',
      'repo-1',
      'user-1',
      updateInput,
    );

    expect(result).toMatchObject({
      id: 'access-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      permission: 'READ',
    });

    expect(mockedTeamRepositoryUpdate).toHaveBeenCalledWith({
      where: {
        id: 'access-1',
      },
      data: {
        permission: 'READ',
      },
      select: {
        id: true,
        teamId: true,
        repositoryId: true,
        permission: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects updating missing team repository access', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce(null);

    await expect(
      updateTeamRepository(
        'gitzone-platform',
        'team-1',
        'repo-1',
        'user-1',
        updateInput,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
    });

    expect(mockedTeamRepositoryUpdate).not.toHaveBeenCalled();
  });

  it('removes existing team repository access', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce({ id: 'access-1' });

    await expect(
      removeTeamRepository(
        'gitzone-platform',
        'team-1',
        'repo-1',
        'user-1',
      ),
    ).resolves.toBeUndefined();

    expect(mockedTeamRepositoryDelete).toHaveBeenCalledWith({
      where: {
        id: 'access-1',
      },
    });
  });

  it('rejects removing missing team repository access', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce(null);

    await expect(
      removeTeamRepository(
        'gitzone-platform',
        'team-1',
        'repo-1',
        'user-1',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
    });

    expect(mockedTeamRepositoryDelete).not.toHaveBeenCalled();
  });

  it('maps a concurrent delete race to a not-found error', async () => {
    mockedTeamRepositoryFindUnique.mockResolvedValueOnce({ id: 'access-1' });

    const notFoundError = Object.assign(new Error('Record not found'), {
      code: 'P2025',
    });

    mockedTeamRepositoryDelete.mockRejectedValueOnce(notFoundError);

    await expect(
      removeTeamRepository(
        'gitzone-platform',
        'team-1',
        'repo-1',
        'user-1',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
    });
  });
});
