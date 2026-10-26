import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedAddTeamMember } = vi.hoisted(() => ({
  mockedAddTeamMember: vi.fn(),
}));

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/middleware/auth.middleware.js', () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    (req as Request & { userId: string }).userId = 'owner-1';
    next();
  },
}));

vi.mock('../../../src/services/organizations/team.service.js', () => ({
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  addTeamMember: mockedAddTeamMember,
}));

const { default: app } = await import('../../../src/app.js');
const { AppError } = await import('../../../src/errors/app.error.js');

const endpoint = '/api/organizations/gitzone/teams/team-1/members';

const membership = {
  id: 'team-member-1',
  teamId: 'team-1',
  userId: 'user-2',
  createdAt: '2026-10-24T00:00:00.000Z',
  user: {
    id: 'user-2',
    username: 'developer2',
    name: 'Developer Two',
    avatarUrl: null,
  },
};

describe('POST /api/organizations/:slug/teams/:teamId/members', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requires authentication', async () => {
    await request(app)
      .post(endpoint)
      .send({ username: 'developer2' })
      .expect(401);

    expect(mockedAddTeamMember).not.toHaveBeenCalled();
  });

  it('rejects an invalid organization slug', async () => {
    const response = await request(app)
      .post('/api/organizations/INVALID_SLUG/teams/team-1/members')
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_ORGANIZATION_SLUG');
    expect(mockedAddTeamMember).not.toHaveBeenCalled();
  });

  it('rejects an invalid team ID', async () => {
    const response = await request(app)
      .post('/api/organizations/gitzone/teams/%20/members')
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_TEAM_ID');
    expect(mockedAddTeamMember).not.toHaveBeenCalled();
  });

  it('rejects an invalid username', async () => {
    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'x' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_TEAM_MEMBER_DATA');
    expect(mockedAddTeamMember).not.toHaveBeenCalled();
  });

  it('rejects unexpected request properties', async () => {
    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2', role: 'OWNER' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_TEAM_MEMBER_DATA');
    expect(mockedAddTeamMember).not.toHaveBeenCalled();
  });

  it('adds a valid member and returns 201', async () => {
    mockedAddTeamMember.mockResolvedValue(membership);

    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: { member: membership },
    });
    expect(mockedAddTeamMember).toHaveBeenCalledWith(
      'gitzone',
      'team-1',
      'owner-1',
      'developer2',
    );
  });

  it('returns 403 when the actor is not an organization owner', async () => {
    mockedAddTeamMember.mockRejectedValue(
      new AppError(
        'Organization owner permission required',
        403,
        'ORGANIZATION_OWNER_REQUIRED',
      ),
    );

    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(403);

    expect(response.body.error.code).toBe('ORGANIZATION_OWNER_REQUIRED');
  });

  it('returns 404 when the target user does not exist', async () => {
    mockedAddTeamMember.mockRejectedValue(
      new AppError('User not found', 404, 'TEAM_MEMBER_USER_NOT_FOUND'),
    );

    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'unknown-user' })
      .expect(404);

    expect(response.body.error.code).toBe('TEAM_MEMBER_USER_NOT_FOUND');
  });

  it('returns 409 when the user is not an organization member', async () => {
    mockedAddTeamMember.mockRejectedValue(
      new AppError(
        'User must be an organization member before joining a team',
        409,
        'TEAM_MEMBER_NOT_ORGANIZATION_MEMBER',
      ),
    );

    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(409);

    expect(response.body.error.code).toBe('TEAM_MEMBER_NOT_ORGANIZATION_MEMBER');
  });

  it('returns 409 when the user is already on the team', async () => {
    mockedAddTeamMember.mockRejectedValue(
      new AppError(
        'User is already a member of this team',
        409,
        'TEAM_MEMBER_ALREADY_EXISTS',
      ),
    );

    const response = await request(app)
      .post(endpoint)
      .set('Authorization', 'Bearer test-token')
      .send({ username: 'developer2' })
      .expect(409);

    expect(response.body.error.code).toBe('TEAM_MEMBER_ALREADY_EXISTS');
  });
});
