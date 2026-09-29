import type {
  Request,
  Response,
} from 'express';

import { AppError } from '../../errors/app.error.js';
import type {
  OptionalAuthenticatedRequest,
} from '../../middleware/optional-auth.middleware.js';
import {
  getGitRepositoryRefs,
} from '../../services/git/git-ref.service.js';
import {
  authorizeRepositoryContentRead,
} from '../../services/repositories/repository-content-access.service.js';

export const getRefs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    username,
    name,
  } = req.params;

  if (
    typeof username !== 'string' ||
    typeof name !== 'string'
  ) {
    throw new AppError(
      'Username and repository name are required',
      400,
      'INVALID_REPOSITORY_PARAMS',
    );
  }

  const authenticatedReq =
    req as OptionalAuthenticatedRequest;

  const access =
    await authorizeRepositoryContentRead(
      username,
      name,
      authenticatedReq.userId,
    );

  const refs =
    await getGitRepositoryRefs(
      access.repositoryOwnerUsername,
      access.repositoryName,
    );

  res.status(200).json({
    success: true,

    data: {
      refs,
    },
  });
};
