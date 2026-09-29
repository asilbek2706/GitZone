import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import prisma from '../../../src/config/prisma.js';
import { AppError } from '../../../src/errors/app.error.js';
import {
  authorizeRepositoryAccess,
} from '../../../src/services/repositories/repository-authorization.service.js';
import {
  authorizeRepositoryContentRead,
} from '../../../src/services/repositories/repository-content-access.service.js';

vi.mock(
  '../../../src/config/prisma.js',
  () => ({
    default: {
      repository: {
        findFirst: vi.fn(),
      },
    },
  }),
);

vi.mock(
  '../../../src/services/repositories/repository-authorization.service.js',
  () => ({
    authorizeRepositoryAccess:
      vi.fn(),
  }),
);

const mockedFindFirst =
  vi.mocked(
    prisma.repository.findFirst,
  );

const mockedAuthorize =
  vi.mocked(
    authorizeRepositoryAccess,
  );

const accessResult = {
  repositoryId: 'repo-1',
  repositoryName: 'demo',
  repositoryOwnerId: 'owner-1',
  repositoryOwnerUsername: 'asil',
  isPrivate: false,
  permission: 'PUBLIC',
} as const;

describe(
  'repository content access service',
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('throws 404 when repository does not exist', async () => {
      mockedFindFirst
        .mockResolvedValue(
          null as never,
        );

      await expect(
        authorizeRepositoryContentRead(
          'asil',
          'missing',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code:
          'REPOSITORY_NOT_FOUND',
      });

      expect(
        mockedAuthorize,
      ).not.toHaveBeenCalled();
    });

    it('authorizes anonymous repository read', async () => {
      mockedFindFirst
        .mockResolvedValue({
          id: 'repo-1',
        } as never);

      mockedAuthorize
        .mockResolvedValue(
          accessResult,
        );

      const result =
        await authorizeRepositoryContentRead(
          'asil',
          'demo',
        );

      expect(result)
        .toEqual(accessResult);

      expect(
        mockedAuthorize,
      ).toHaveBeenCalledWith(
        'repo-1',
        'READ',
        undefined,
      );
    });

    it('passes authenticated user to authorization service', async () => {
      mockedFindFirst
        .mockResolvedValue({
          id: 'repo-1',
        } as never);

      mockedAuthorize
        .mockResolvedValue({
          ...accessResult,
          isPrivate: true,
          permission: 'READ',
        });

      await authorizeRepositoryContentRead(
        'asil',
        'demo',
        'viewer-1',
      );

      expect(
        mockedAuthorize,
      ).toHaveBeenCalledWith(
        'repo-1',
        'READ',
        'viewer-1',
      );
    });

    it('hides unauthorized private repository existence', async () => {
      mockedFindFirst
        .mockResolvedValue({
          id: 'repo-1',
        } as never);

      mockedAuthorize
        .mockRejectedValue(
          new AppError(
            'You do not have permission to access this repository',
            403,
            'REPOSITORY_ACCESS_DENIED',
          ),
        );

      await expect(
        authorizeRepositoryContentRead(
          'asil',
          'private-demo',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code:
          'REPOSITORY_NOT_FOUND',
      });
    });
  },
);
