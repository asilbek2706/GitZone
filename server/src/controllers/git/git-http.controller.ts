import type {
  Request,
  Response,
} from 'express';

import prisma from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/app.error.js';

import { verifyPersonalAccessToken } from '../../services/auth/pat.service.js';

import { executeGitHttpBackend } from '../../services/git/git-http-backend.service.js';

import { authorizeRepositoryAccess } from '../../services/repositories/repository-authorization.service.js';

import { parseGitBasicAuthorization } from '../../utils/git/basic-auth.js';

import { buildGitHttpPathInfo } from '../../utils/git/http-path.js';

import { classifyGitHttpRequest } from '../../utils/git/http-request.js';

const getGitRepository = async (
  username: string,
  repositoryName: string,
) => {
  const repository =
    await prisma.repository.findFirst({
      where: {
        name: repositoryName,

        owner: {
          username,
        },
      },

      select: {
        id: true,
        name: true,
        isPrivate: true,
        defaultBranch: true,

        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

  if (!repository) {
    throw new AppError(
      'Repository not found',
      404,
      'REPOSITORY_NOT_FOUND',
    );
  }

  return repository;
};

const authenticateGitRequest = async (
  req: Request,
): Promise<{
  userId: string;
  username: string;
}> => {
  const credentials =
    parseGitBasicAuthorization(
      req.headers.authorization,
    );

  if (!credentials) {
    throw new AppError(
      'Git username and personal access token are required',
      401,
      'GIT_AUTH_REQUIRED',
    );
  }

  return verifyPersonalAccessToken(
    credentials.username,
    credentials.password,
  );
};

export const gitHttpController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    username,
    repository,
  } = req.params;

  if (
    typeof username !== 'string' ||
    typeof repository !== 'string'
  ) {
    throw new AppError(
      'Invalid Git repository path',
      400,
      'INVALID_GIT_REPOSITORY_PATH',
    );
  }

  const requestInfo =
    classifyGitHttpRequest(
      req.method,
      req.path,
      req.query.service,
    );

  const gitRepository =
    await getGitRepository(
      username,
      repository,
    );

  const repositoryOwner =
    gitRepository.owner.username;

  const repositoryName =
    gitRepository.name;

  const pathInfo =
    buildGitHttpPathInfo(
      repositoryOwner,
      repositoryName,
      req.path,
    );

  const authenticationRequired =
    gitRepository.isPrivate ||
    requestInfo.accessType === 'WRITE';

  logger.info(
    {
      method: req.method,
      path: req.path,
      username: repositoryOwner,
      repository: repositoryName,
      pathInfo,
      service: requestInfo.service,
      accessType:
        requestInfo.accessType,
      isPrivate:
        gitRepository.isPrivate,
      authenticationRequired,
    },
    'Git HTTP request received',
  );

  let remoteUser: string | null =
    null;

  try {
    if (authenticationRequired) {
      const authenticatedUser =
        await authenticateGitRequest(
          req,
        );

      const access =
        await authorizeRepositoryAccess(
          gitRepository.id,
          requestInfo.accessType,
          authenticatedUser.userId,
        );

      remoteUser =
        authenticatedUser.username;

      logger.info(
        {
          username:
            authenticatedUser.username,
        },
        'Git HTTP user authenticated',
      );

      logger.info(
        {
          permission:
            access.permission,

          repository:
            repositoryName,

          username:
            repositoryOwner,

          authenticatedUsername:
            authenticatedUser.username,
        },
        'Git HTTP access authorized',
      );
    } else {
      const access =
        await authorizeRepositoryAccess(
          gitRepository.id,
          requestInfo.accessType,
        );

      logger.info(
        {
          permission:
            access.permission,

          repository:
            repositoryName,

          username:
            repositoryOwner,
        },
        'Git HTTP access authorized',
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 401) {
        res.setHeader(
          'WWW-Authenticate',
          'Basic realm="GitZone"',
        );
      }

      res
        .status(error.statusCode)
        .json({
          success: false,

          message:
            error.message,

          code:
            error.code,
        });

      return;
    }

    throw error;
  }

  await executeGitHttpBackend({
    req,
    res,
    pathInfo,
    remoteUser,
    repositoryOwner,
    repositoryName,
  });
};
