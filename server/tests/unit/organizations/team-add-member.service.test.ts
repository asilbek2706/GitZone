import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedOrganizationFindUnique,
  mockedOrganizationMemberFindUnique,
  mockedTeamFindFirst,
  mockedUserFindUnique,
  mockedTeamMemberCreate,
} = vi.hoisted(() => ({
  mockedOrganizationFindUnique: vi.fn(),
  mockedOrganizationMemberFindUnique: vi.fn(),
  mockedTeamFindFirst: vi.fn(),
  mockedUserFindUnique: vi.fn(),
  mockedTeamMemberCreate: vi.fn(),
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    organization: { findUnique: mockedOrganizationFindUnique },
    organizationMember: { findUnique: mockedOrganizationMemberFindUnique },
    team: { findFirst: mockedTeamFindFirst },
    user: { findUnique: mockedUserFindUnique },
    teamMember: { create: mockedTeamMemberCreate },
  },
}));

const { addTeamMember } = await import(
  '../../../src/services/organizations/team.service.js'
);

const targetUser = {
  id: 'user-2',
  username: 'developer2',
  name: 'Developer Two',
  avatarUrl: null,
};

const createdMembership = {
  id: 'team-member-1',
  teamId: 'team-1',
  userId: 'user-2',
  createdAt: new Date('2026-10-24T00:00:00.000Z'),
  user: targetUser,
};

describe('Add team member service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedOrganizationFindUnique.mockResolvedValue({ id: 'org-1' });
    mockedOrganizationMemberFindUnique.mockResolvedValue({ role: 'OWNER' });
    mockedTeamFindFirst.mockResolvedValue({ id: 'team-1' });
    mockedUserFindUnique.mockResolvedValue(targetUser);
    mockedTeamMemberCreate.mockResolvedValue(createdMembership);
  });

  it('adds an organization member to a team for its owner', async () => {
    const result = await addTeamMember(
      'gitzone-platform',
      'team-1',
      'owner-1',
      'developer2',
    );

    expect(result).toEqual(createdMembership);
    expect(mockedTeamFindFirst).toHaveBeenCalledWith({
      where: { id: 'team-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(mockedUserFindUnique).toHaveBeenCalledWith({
      where: { username: 'developer2' },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
      },
    });
    expect(mockedTeamMemberCreate).toHaveBeenCalledWith({
      data: { teamId: 'team-1', userId: 'user-2' },
      select: {
        id: true,
        teamId: true,
        userId: true,
        createdAt: true,
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
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it('returns 404 when the organization does not exist', async () => {
    mockedOrganizationFindUnique.mockResolvedValueOnce(null);

    await expect(
      addTeamMember('missing-org', 'team-1', 'owner-1', 'developer2'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORGANIZATION_NOT_FOUND',
    });

    expect(mockedTeamMemberCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['a regular member', { role: 'MEMBER' }],
    ['a non-member', null],
  ])('rejects an actor who is %s', async (_description, membership) => {
    mockedOrganizationMemberFindUnique.mockResolvedValueOnce(membership);

    await expect(
      addTeamMember('gitzone-platform', 'team-1', 'actor-1', 'developer2'),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORGANIZATION_OWNER_REQUIRED',
    });

    expect(mockedTeamFindFirst).not.toHaveBeenCalled();
    expect(mockedTeamMemberCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the team does not belong to the organization', async () => {
    mockedTeamFindFirst.mockResolvedValueOnce(null);

    await expect(
      addTeamMember('gitzone-platform', 'foreign-team', 'owner-1', 'developer2'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_NOT_FOUND',
    });

    expect(mockedTeamMemberCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the target username does not exist', async () => {
    mockedUserFindUnique.mockResolvedValueOnce(null);

    await expect(
      addTeamMember('gitzone-platform', 'team-1', 'owner-1', 'unknown-user'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_MEMBER_USER_NOT_FOUND',
    });

    expect(mockedTeamMemberCreate).not.toHaveBeenCalled();
  });

  it('rejects a user who is not an organization member', async () => {
    mockedOrganizationMemberFindUnique
      .mockResolvedValueOnce({ role: 'OWNER' })
      .mockResolvedValueOnce(null);

    await expect(
      addTeamMember('gitzone-platform', 'team-1', 'owner-1', 'developer2'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEAM_MEMBER_NOT_ORGANIZATION_MEMBER',
    });

    expect(mockedTeamMemberCreate).not.toHaveBeenCalled();
  });

  it('maps duplicate team membership to 409', async () => {
    mockedTeamMemberCreate.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );

    await expect(
      addTeamMember('gitzone-platform', 'team-1', 'owner-1', 'developer2'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEAM_MEMBER_ALREADY_EXISTS',
    });
  });

  it('propagates unexpected database errors', async () => {
    const error = new Error('Database connection failed');
    mockedTeamMemberCreate.mockRejectedValueOnce(error);

    await expect(
      addTeamMember('gitzone-platform', 'team-1', 'owner-1', 'developer2'),
    ).rejects.toBe(error);
  });
});
