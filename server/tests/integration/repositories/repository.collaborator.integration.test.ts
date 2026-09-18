import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';

import {
  addRepositoryCollaborator,
  getRepositoryCollaborators,
  removeRepositoryCollaborator,
  updateRepositoryCollaborator,
} from '../../../src/services/repositories/repository-collaborator.service.js';

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/services/repositories/repository.service.js', () => ({
  createRepository: vi.fn(),
  deleteRepository: vi.fn(),
  getRepositoryByUsernameAndName: vi.fn(),
  getUserRepositories: vi.fn(),
  updateRepository: vi.fn(),
}));

vi.mock('../../../src/services/repositories/repository-collaborator.service.js', () => ({
  addRepositoryCollaborator: vi.fn(),
  getRepositoryCollaborators: vi.fn(),
  updateRepositoryCollaborator: vi.fn(),
  removeRepositoryCollaborator: vi.fn(),
}));

vi.mock('../../../src/middleware/auth.middleware.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    (
      req as Request & {
        userId: string;
      }
    ).userId = 'owner-1';

    next();
  },
}));

const mockedAddRepositoryCollaborator = vi.mocked(addRepositoryCollaborator);

const mockedGetRepositoryCollaborators = vi.mocked(getRepositoryCollaborators);

const mockedUpdateRepositoryCollaborator = vi.mocked(updateRepositoryCollaborator);

const mockedRemoveRepositoryCollaborator = vi.mocked(removeRepositoryCollaborator);

const createdAt = new Date('2026-09-12T12:00:00.000Z');

const updatedAt = new Date('2026-09-12T12:00:00.000Z');

const collaborator = {
  id: 'collaborator-1',
  permission: 'READ' as const,
  createdAt,
  updatedAt,
  user: {
    id: 'user-2',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: null,
  },
};

describe('repository collaborator API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('adds a repository collaborator', async () => {
    mockedAddRepositoryCollaborator.mockResolvedValue(collaborator);

    const response = await request(app).post('/api/repositories/asil/demo/collaborators').send({
      username: 'testuser',
      permission: 'READ',
    });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        collaborator: {
          id: 'collaborator-1',
          permission: 'READ',
          user: {
            id: 'user-2',
            username: 'testuser',
            name: 'Test User',
          },
        },
      },
    });

    expect(mockedAddRepositoryCollaborator).toHaveBeenCalledWith(
      'owner-1',
      'asil',
      'demo',
      'testuser',
      'READ',
    );
  });

  it('rejects invalid collaborator creation data', async () => {
    const response = await request(app).post('/api/repositories/asil/demo/collaborators').send({
      username: '',
      permission: 'ADMIN',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_COLLABORATOR_DATA',
        message: 'Invalid collaborator data',
      },
    });

    expect(mockedAddRepositoryCollaborator).not.toHaveBeenCalled();
  });

  it('lists repository collaborators', async () => {
    mockedGetRepositoryCollaborators.mockResolvedValue([
      collaborator,
      {
        ...collaborator,
        id: 'collaborator-2',
        permission: 'WRITE',
        user: {
          id: 'user-3',
          username: 'developer',
          name: 'Developer',
          avatarUrl: null,
        },
      },
    ]);

    const response = await request(app).get('/api/repositories/asil/demo/collaborators');

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.collaborators).toHaveLength(2);

    expect(response.body.data.collaborators[0].user.username).toBe('testuser');

    expect(response.body.data.collaborators[1].permission).toBe('WRITE');

    expect(mockedGetRepositoryCollaborators).toHaveBeenCalledWith('owner-1', 'asil', 'demo');
  });

  it('updates repository collaborator permission', async () => {
    const updatedCollaborator = {
      ...collaborator,
      permission: 'WRITE' as const,
    };

    mockedUpdateRepositoryCollaborator.mockResolvedValue(updatedCollaborator);

    const response = await request(app)
      .patch('/api/repositories/asil/demo/collaborators/testuser')
      .send({
        permission: 'WRITE',
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        collaborator: {
          id: 'collaborator-1',
          permission: 'WRITE',
          user: {
            username: 'testuser',
          },
        },
      },
    });

    expect(mockedUpdateRepositoryCollaborator).toHaveBeenCalledWith(
      'owner-1',
      'asil',
      'demo',
      'testuser',
      'WRITE',
    );
  });

  it('rejects invalid collaborator permission update', async () => {
    const response = await request(app)
      .patch('/api/repositories/asil/demo/collaborators/testuser')
      .send({
        permission: 'ADMIN',
      });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_COLLABORATOR_DATA',
        message: 'Invalid collaborator data',
      },
    });

    expect(mockedUpdateRepositoryCollaborator).not.toHaveBeenCalled();
  });

  it('removes a repository collaborator', async () => {
    mockedRemoveRepositoryCollaborator.mockResolvedValue(undefined);

    const response = await request(app).delete(
      '/api/repositories/asil/demo/collaborators/testuser',
    );

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Repository collaborator removed successfully',
    });

    expect(mockedRemoveRepositoryCollaborator).toHaveBeenCalledWith(
      'owner-1',
      'asil',
      'demo',
      'testuser',
    );
  });
});
