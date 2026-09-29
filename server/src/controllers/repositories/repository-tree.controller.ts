import type {
  Request,
  Response,
} from 'express';

import { AppError } from '../../errors/app.error.js';
import type {
  OptionalAuthenticatedRequest,
} from '../../middleware/optional-auth.middleware.js';
import {
  getGitRepositoryTree,
} from '../../services/git/git-tree.service.js';
import {
  authorizeRepositoryContentRead,
} from '../../services/repositories/repository-content-access.service.js';
import {
  repositoryTreeQuerySchema,
} from '../../validations/repositories/repository-tree.validation.js';

export const getTree = async (
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

  const parsed =
    repositoryTreeQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    throw new AppError(
      'Invalid repository tree query',
      400,
      'INVALID_REPOSITORY_TREE_QUERY',
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

  const tree =
    await getGitRepositoryTree(
      access.repositoryOwnerUsername,
      access.repositoryName,
      parsed.data.ref,
      parsed.data.path,
    );

  res.status(200).json({
    success: true,

    data: {
      tree,
    },
  });
};
