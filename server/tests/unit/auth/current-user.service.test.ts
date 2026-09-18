import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';
import { getCurrentUser } from '../../../src/services/auth/current-user.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const baseUser = {
  id: 'user-1',
  username: 'asil',
  email: 'asil@example.com',
  password: 'hashed-password',
  name: 'Asil',
  avatarUrl: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('current user service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns current user', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    const result = await getCurrentUser('user-1');

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('asil@example.com');
  });
  it('throws 404 when current user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(getCurrentUser('missing-user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
