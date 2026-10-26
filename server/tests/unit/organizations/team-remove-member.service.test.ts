import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  organizationFindUnique: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  teamFindFirst: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  teamMemberDeleteMany: vi.fn(),
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    organization: { findUnique: mocks.organizationFindUnique },
    organizationMember: { findUnique: mocks.organizationMemberFindUnique },
    team: { findFirst: mocks.teamFindFirst },
    teamMember: {
      findUnique: mocks.teamMemberFindUnique,
      deleteMany: mocks.teamMemberDeleteMany,
    },
  },
}));

const { removeTeamMember } = await import('../../../src/services/organizations/team.service.js');

const slug = 'gitzone-platform';
const teamId = 'team-1';
const actorId = 'owner-1';
const targetUserId = 'user-2';

describe('Remove team member service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.organizationFindUnique.mockResolvedValue({ id: 'org-1' });
    mocks.organizationMemberFindUnique.mockResolvedValue({ role: 'OWNER' });
    mocks.teamFindFirst.mockResolvedValue({ id: teamId });
    mocks.teamMemberFindUnique.mockResolvedValue({ id: 'team-member-1' });
    mocks.teamMemberDeleteMany.mockResolvedValue({ count: 1 });
  });

  it('removes only the team membership for an organization owner', async () => {
    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).resolves.toEqual({
      teamId,
      removedUserId: targetUserId,
    });

    expect(mocks.teamFindFirst).toHaveBeenCalledWith({
      where: { id: teamId, organizationId: 'org-1' },
      select: { id: true },
    });
    expect(mocks.teamMemberDeleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { teamId, userId: targetUserId },
    });
  });

  it('returns 404 when the organization does not exist', async () => {
    mocks.organizationFindUnique.mockResolvedValue(null);

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORGANIZATION_NOT_FOUND',
    });

    expect(mocks.teamMemberDeleteMany).not.toHaveBeenCalled();
  });

  it('rejects a non-owner', async () => {
    mocks.organizationMemberFindUnique.mockResolvedValue({ role: 'MEMBER' });

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORGANIZATION_OWNER_REQUIRED',
    });

    expect(mocks.teamMemberDeleteMany).not.toHaveBeenCalled();
  });

  it('returns 404 when the team does not belong to the organization', async () => {
    mocks.teamFindFirst.mockResolvedValue(null);

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_NOT_FOUND',
    });

    expect(mocks.teamMemberDeleteMany).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is not a member of the team', async () => {
    mocks.teamMemberFindUnique.mockResolvedValue(null);

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEAM_MEMBER_NOT_FOUND',
    });

    expect(mocks.teamMemberDeleteMany).not.toHaveBeenCalled();
  });

  it('detects a membership removal race condition', async () => {
    mocks.teamMemberDeleteMany.mockResolvedValue({ count: 0 });

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEAM_MEMBERSHIP_CHANGED',
    });
  });

  it('propagates database errors', async () => {
    const error = new Error('Database unavailable');
    mocks.teamMemberDeleteMany.mockRejectedValue(error);

    await expect(removeTeamMember(slug, teamId, actorId, targetUserId)).rejects.toBe(error);
  });
});
