import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';
import { logoutUser } from '../../../src/services/auth/logout.service.js';
import { hashRefreshToken } from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    session: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  hashRefreshToken: vi.fn(),
}));

const mockedSessionUpdateMany = vi.mocked(prisma.session.updateMany);
const mockedHashRefreshToken = vi.mocked(hashRefreshToken);

describe('logout service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHashRefreshToken.mockReturnValue('refresh-hash');
  });

  it('logs out by revoking active refresh session', async () => {
    mockedSessionUpdateMany.mockResolvedValue({
      count: 1,
    } as never);

    await expect(logoutUser('refresh-token')).resolves.toBeUndefined();

    expect(mockedHashRefreshToken).toHaveBeenCalledWith('refresh-token');

    expect(mockedSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: 'refresh-hash',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
