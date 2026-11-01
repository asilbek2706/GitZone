import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedAddTeamRepository,
  mockedGetTeamRepositories,
  mockedUpdateTeamRepository,
  mockedRemoveTeamRepository,
} = vi.hoisted(() => ({
  mockedAddTeamRepository: vi.fn(),
  mockedGetTeamRepositories: vi.fn(),
  mockedUpdateTeamRepository: vi.fn(),
  mockedRemoveTeamRepository: vi.fn(),
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

vi.mock('../../../src/services/organizations/team-repository.service.js', () => ({
  addTeamRepository: mockedAddTeamRepository,
  getTeamRepositories: mockedGetTeamRepositories,
  updateTeamRepository: mockedUpdateTeamRepository,
  removeTeamRepository: mockedRemoveTeamRepository,
}));

const { default: app } = await import('../../../src/app.js');
const { AppError } = await import('../../../src/errors/app.error.js');

const baseEndpoint = '/api/organizations/gitzone/teams/team-1/repositories';

const access = {
  id: 'access-1',
  teamId: 'team-1',
  repositoryId: 'repo-1',
  permission: 'WRITE',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

describe('Team repository API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/organizations/:slug/teams/:teamId/repositories', () => {
    it('requires authentication', async () => {
      await request(app)
        .post(baseEndpoint)
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(401);

      expect(mockedAddTeamRepository).not.toHaveBeenCalled();
    });

    it('rejects an invalid organization slug', async () => {
      const response = await request(app)
        .post('/api/organizations/INVALID_SLUG/teams/team-1/repositories')
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_ORGANIZATION_SLUG');
      expect(mockedAddTeamRepository).not.toHaveBeenCalled();
    });

    it('rejects invalid team ID', async () => {
      const response = await request(app)
        .post('/api/organizations/gitzone/teams/%20/repositories')
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TEAM_PARAMS');
      expect(mockedAddTeamRepository).not.toHaveBeenCalled();
    });

    it('rejects invalid repository data', async () => {
      const response = await request(app)
        .post(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'ADMIN' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TEAM_REPOSITORY_DATA');
      expect(mockedAddTeamRepository).not.toHaveBeenCalled();
    });

    it('rejects unexpected request properties', async () => {
      const response = await request(app)
        .post(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .send({
          repositoryId: 'repo-1',
          permission: 'WRITE',
          role: 'OWNER',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TEAM_REPOSITORY_DATA');
      expect(mockedAddTeamRepository).not.toHaveBeenCalled();
    });

    it('adds repository access and returns 201', async () => {
      mockedAddTeamRepository.mockResolvedValue(access);

      const response = await request(app)
        .post(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: { access },
      });

      expect(mockedAddTeamRepository).toHaveBeenCalledWith(
        'gitzone',
        'team-1',
        'owner-1',
        {
          repositoryId: 'repo-1',
          permission: 'WRITE',
        },
      );
    });

    it('returns service authorization errors', async () => {
      mockedAddTeamRepository.mockRejectedValue(
        new AppError(
          'Organization owner permission required',
          403,
          'ORGANIZATION_OWNER_REQUIRED',
        ),
      );

      const response = await request(app)
        .post(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(403);

      expect(response.body.error.code).toBe('ORGANIZATION_OWNER_REQUIRED');
    });

    it('returns conflict when access already exists', async () => {
      mockedAddTeamRepository.mockRejectedValue(
        new AppError(
          'Team already has access to this repository',
          409,
          'TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS',
        ),
      );

      const response = await request(app)
        .post(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ repositoryId: 'repo-1', permission: 'WRITE' })
        .expect(409);

      expect(response.body.error.code).toBe('TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS');
    });
  });

  describe('GET /api/organizations/:slug/teams/:teamId/repositories', () => {
    it('requires authentication', async () => {
      await request(app).get(baseEndpoint).expect(401);

      expect(mockedGetTeamRepositories).not.toHaveBeenCalled();
    });

    it('lists team repositories', async () => {
      mockedGetTeamRepositories.mockResolvedValue([access]);

      const response = await request(app)
        .get(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { repositories: [access] },
      });

      expect(mockedGetTeamRepositories).toHaveBeenCalledWith(
        'gitzone',
        'team-1',
        'owner-1',
      );
    });

    it('returns owner authorization errors', async () => {
      mockedGetTeamRepositories.mockRejectedValue(
        new AppError(
          'Organization owner permission required',
          403,
          'ORGANIZATION_OWNER_REQUIRED',
        ),
      );

      const response = await request(app)
        .get(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .expect(403);

      expect(response.body.error.code).toBe('ORGANIZATION_OWNER_REQUIRED');
    });
  });

  describe('PATCH /api/organizations/:slug/teams/:teamId/repositories/:repositoryId', () => {
    const endpoint = `${baseEndpoint}/repo-1`;

    it('rejects invalid permission data', async () => {
      const response = await request(app)
        .patch(endpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ permission: 'ADMIN' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TEAM_REPOSITORY_DATA');
      expect(mockedUpdateTeamRepository).not.toHaveBeenCalled();
    });

    it('updates repository permission and returns 200', async () => {
      const updatedAccess = {
        ...access,
        permission: 'READ',
      };

      mockedUpdateTeamRepository.mockResolvedValue(updatedAccess);

      const response = await request(app)
        .patch(endpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ permission: 'READ' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { access: updatedAccess },
      });

      expect(mockedUpdateTeamRepository).toHaveBeenCalledWith(
        'gitzone',
        'team-1',
        'repo-1',
        'owner-1',
        { permission: 'READ' },
      );
    });

    it('returns not found when access does not exist', async () => {
      mockedUpdateTeamRepository.mockRejectedValue(
        new AppError(
          'Team repository access not found',
          404,
          'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
        ),
      );

      const response = await request(app)
        .patch(endpoint)
        .set('Authorization', 'Bearer test-token')
        .send({ permission: 'READ' })
        .expect(404);

      expect(response.body.error.code).toBe('TEAM_REPOSITORY_ACCESS_NOT_FOUND');
    });
  });

  describe('DELETE /api/organizations/:slug/teams/:teamId/repositories/:repositoryId', () => {
    const endpoint = `${baseEndpoint}/repo-1`;

    it('requires authentication', async () => {
      await request(app).delete(endpoint).expect(401);

      expect(mockedRemoveTeamRepository).not.toHaveBeenCalled();
    });

    it('removes repository access and returns 200', async () => {
      mockedRemoveTeamRepository.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(endpoint)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Team repository access removed successfully',
      });

      expect(mockedRemoveTeamRepository).toHaveBeenCalledWith(
        'gitzone',
        'team-1',
        'repo-1',
        'owner-1',
      );
    });

    it('returns not found when access does not exist', async () => {
      mockedRemoveTeamRepository.mockRejectedValue(
        new AppError(
          'Team repository access not found',
          404,
          'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
        ),
      );

      const response = await request(app)
        .delete(endpoint)
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.error.code).toBe('TEAM_REPOSITORY_ACCESS_NOT_FOUND');
    });
  });
});
