import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { getPublicUserProfile } from '../../../src/services/profiles/profile.service.js';
import { AppError } from '../../../src/errors/app.error.js';

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/services/profiles/profile.service.js', () => ({
  getPublicUserProfile: vi.fn(),
}));

const mockedGetPublicUserProfile = vi.mocked(getPublicUserProfile);

const publicUser = {
  id: 'user-1',
  username: 'asil',
  name: 'Asil',
  bio: 'Full Stack Developer',
  avatarUrl: null,
  location: 'Uzbekistan',
  website: 'https://example.com',
  createdAt: new Date('2026-10-09T12:00:00.000Z'),
};

describe('public profile API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns public profile for an existing user', async () => {
    mockedGetPublicUserProfile.mockResolvedValue(publicUser);

    const response = await request(app).get('/api/users/asil');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'user-1',
          username: 'asil',
          name: 'Asil',
          bio: 'Full Stack Developer',
          location: 'Uzbekistan',
          website: 'https://example.com',
        },
      },
    });

    expect(mockedGetPublicUserProfile).toHaveBeenCalledWith('asil');
  });

  it('returns 404 for a missing user', async () => {
    mockedGetPublicUserProfile.mockRejectedValue(
      new AppError('User not found', 404, 'USER_NOT_FOUND'),
    );

    const response = await request(app).get('/api/users/unknownuser');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
      },
    });
  });

  it('rejects invalid usernames', async () => {
    const response = await request(app).get('/api/users/invalid.username');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_USERNAME',
      },
    });

    expect(mockedGetPublicUserProfile).not.toHaveBeenCalled();
  });

  it('does not expose sensitive fields in public response', async () => {
    mockedGetPublicUserProfile.mockResolvedValue(publicUser);

    const response = await request(app).get('/api/users/asil');

    expect(response.status).toBe(200);

    const user = response.body.data.user;

    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('updatedAt');
    expect(user).not.toHaveProperty('sessions');
    expect(user).not.toHaveProperty('twoFactorAuthentication');
  });
});
