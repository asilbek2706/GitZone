import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';

import {
  createRepository,
  deleteRepository,
  getRepositoryByUsernameAndName,
  getUserRepositories,
  updateRepository,
} from '../../../src/services/repositories/repository.service.js';

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

const mockedCreateRepository = vi.mocked(createRepository);

const mockedDeleteRepository = vi.mocked(deleteRepository);

const mockedGetRepositoryByUsernameAndName = vi.mocked(getRepositoryByUsernameAndName);

const mockedGetUserRepositories = vi.mocked(getUserRepositories);

const mockedUpdateRepository = vi.mocked(updateRepository);

const createdAt = new Date('2026-09-12T12:00:00.000Z');

const updatedAt = new Date('2026-09-12T12:00:00.000Z');

const repository = {
  id: 'repo-1',
  ownerId: 'owner-1',
  name: 'demo',
  description: 'Demo repository',
  isPrivate: false,
  defaultBranch: 'main',
  createdAt,
  updatedAt,
};

const repositoryWithOwner = {
  ...repository,
  owner: {
    id: 'owner-1',
    username: 'asil',
    name: 'Asil',
    avatarUrl: null,
  },
};

describe('repository API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a repository', async () => {
    mockedCreateRepository.mockResolvedValue(repository);

    const response = await request(app).post('/api/repositories').send({
      name: 'demo',
      description: 'Demo repository',
      isPrivate: false,
    });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        repository: {
          id: 'repo-1',
          ownerId: 'owner-1',
          name: 'demo',
          description: 'Demo repository',
          isPrivate: false,
          defaultBranch: 'main',
        },
      },
    });

    expect(mockedCreateRepository).toHaveBeenCalledWith('owner-1', {
      name: 'demo',
      description: 'Demo repository',
      isPrivate: false,
    });
  });

  it('rejects invalid repository creation data', async () => {
    const response = await request(app).post('/api/repositories').send({
      name: '',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_REPOSITORY_DATA',
        message: 'Invalid repository data',
      },
    });

    expect(mockedCreateRepository).not.toHaveBeenCalled();
  });

  it('lists repositories by username', async () => {
    mockedGetUserRepositories.mockResolvedValue([
      repository,
      {
        ...repository,
        id: 'repo-2',
        name: 'second-repo',
      },
    ]);

    const response = await request(app).get('/api/repositories/asil');

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.repositories).toHaveLength(2);

    expect(response.body.data.repositories[0].name).toBe('demo');

    expect(response.body.data.repositories[1].name).toBe('second-repo');

    expect(mockedGetUserRepositories).toHaveBeenCalledWith('asil');
  });

  it('gets a repository by username and name', async () => {
    mockedGetRepositoryByUsernameAndName.mockResolvedValue(repositoryWithOwner);

    const response = await request(app).get('/api/repositories/asil/demo');

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        repository: {
          id: 'repo-1',
          name: 'demo',
          owner: {
            id: 'owner-1',
            username: 'asil',
          },
        },
      },
    });

    expect(mockedGetRepositoryByUsernameAndName).toHaveBeenCalledWith('asil', 'demo');
  });

  it('updates a repository', async () => {
    const updatedRepository = {
      ...repository,
      name: 'new-name',
      description: 'Updated repository',
      isPrivate: true,
    };

    mockedUpdateRepository.mockResolvedValue(updatedRepository);

    const response = await request(app).patch('/api/repositories/asil/demo').send({
      name: 'new-name',
      description: 'Updated repository',
      isPrivate: true,
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        repository: {
          id: 'repo-1',
          name: 'new-name',
          description: 'Updated repository',
          isPrivate: true,
        },
      },
    });

    expect(mockedUpdateRepository).toHaveBeenCalledWith('owner-1', 'asil', 'demo', {
      name: 'new-name',
      description: 'Updated repository',
      isPrivate: true,
    });
  });

  it('rejects invalid repository update data', async () => {
    const response = await request(app).patch('/api/repositories/asil/demo').send({
      name: 'invalid repo name!',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_REPOSITORY_DATA',
        message: 'Invalid repository data',
      },
    });

    expect(mockedUpdateRepository).not.toHaveBeenCalled();
  });

  it('deletes a repository', async () => {
    mockedDeleteRepository.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/repositories/asil/demo');

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Repository deleted successfully',
    });

    expect(mockedDeleteRepository).toHaveBeenCalledWith('owner-1', 'asil', 'demo');
  });
});
