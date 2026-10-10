import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';
import { renameGitUserDirectory } from '../../../src/services/git/git-user-directory.service.js';
import { changeUsername } from '../../../src/services/profiles/username-change.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/git/git-user-directory.service.js', () => ({
  renameGitUserDirectory: vi.fn(),
}));

const findUnique = vi.mocked(prisma.user.findUnique);
const findFirst = vi.mocked(prisma.user.findFirst);
const update = vi.mocked(prisma.user.update);
const renameDirectory = vi.mocked(renameGitUserDirectory);

describe('username change service', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'olduser',
    } as never);

    findFirst.mockResolvedValue(null as never);
    update.mockResolvedValue({ id: 'user-1' } as never);
    renameDirectory.mockResolvedValue(true);
  });

  it('renames Git storage and updates the database', async () => {
    await changeUsername('user-1', 'newuser');

    expect(renameDirectory).toHaveBeenCalledWith('olduser', 'newuser');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { username: 'newuser' },
      select: { id: true },
    });
  });

  it('does nothing when username is unchanged', async () => {
    await changeUsername('user-1', 'olduser');

    expect(findFirst).not.toHaveBeenCalled();
    expect(renameDirectory).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an invalid username', async () => {
    await expect(
      changeUsername('user-1', '../unsafe'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_USERNAME',
    });

    expect(renameDirectory).not.toHaveBeenCalled();
  });

  it('returns 404 when user does not exist', async () => {
    findUnique.mockResolvedValue(null as never);

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it('rejects case-only username changes', async () => {
    await expect(
      changeUsername('user-1', 'OldUser'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_CASE_CONFLICT',
    });

    expect(renameDirectory).not.toHaveBeenCalled();
  });

  it('rejects a username already taken', async () => {
    findFirst.mockResolvedValue({ id: 'other-user' } as never);

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_TAKEN',
    });

    expect(renameDirectory).not.toHaveBeenCalled();
  });

  it('does not update database when Git rename fails', async () => {
    renameDirectory.mockRejectedValueOnce(
      new Error('Filesystem rename failed'),
    );

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toThrow('Filesystem rename failed');

    expect(update).not.toHaveBeenCalled();
  });

  it('rolls back Git directory when database update fails', async () => {
    update.mockRejectedValueOnce(new Error('Database unavailable'));

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toThrow('Database unavailable');

    expect(renameDirectory).toHaveBeenNthCalledWith(
      1,
      'olduser',
      'newuser',
    );

    expect(renameDirectory).toHaveBeenNthCalledWith(
      2,
      'newuser',
      'olduser',
    );
  });

  it('maps database unique constraint errors to 409', async () => {
    update.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      }),
    );

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_TAKEN',
    });

    expect(renameDirectory).toHaveBeenCalledTimes(2);
  });

  it('reports a failed Git directory rollback', async () => {
    update.mockRejectedValueOnce(new Error('Database unavailable'));

    renameDirectory
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Rollback failed'));

    await expect(
      changeUsername('user-1', 'newuser'),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'USERNAME_ROLLBACK_FAILED',
    });
  });
});