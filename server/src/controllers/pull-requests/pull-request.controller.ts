import type { Request, Response } from 'express';

import type { PullRequestState } from '../../generated/prisma/enums.js';

import { AppError } from '../../errors/app.error.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import type { OptionalAuthenticatedRequest } from '../../middleware/optional-auth.middleware.js';

import {
  createPullRequest,
  getPullRequest,
  getPullRequestCommits,
  getPullRequestDiff,
  getPullRequestMergeability,
  listPullRequests,
  mergePullRequest,
  updatePullRequest,
} from '../../services/pull-requests/pull-request.service.js';

import {
  createPullRequestSchema,
  listPullRequestsQuerySchema,
  pullRequestNumberSchema,
  updatePullRequestSchema,
} from '../../validations/pull-requests/pull-request.validation.js';

const getRepositoryParams = (
  req: Request,
): {
  username: string;
  name: string;
} => {
  const { username, name } = req.params;

  if (typeof username !== 'string' || typeof name !== 'string') {
    throw new AppError(
      'Username and repository name are required',
      400,
      'INVALID_REPOSITORY_PARAMS',
    );
  }

  return {
    username,
    name,
  };
};

const getPullRequestNumber = (req: Request): number => {
  const parsed = pullRequestNumberSchema.safeParse(req.params.number);

  if (!parsed.success) {
    throw new AppError('Invalid pull request number', 400, 'INVALID_PULL_REQUEST_NUMBER');
  }

  return parsed.data;
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { username, name } = getRepositoryParams(req);

  const parsed = createPullRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid pull request data', 400, 'INVALID_PULL_REQUEST_DATA');
  }

  const pullRequest = await createPullRequest(authenticatedReq.userId, username, name, parsed.data);

  res.status(201).json({
    success: true,
    data: {
      pullRequest,
    },
  });
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const optionalReq = req as OptionalAuthenticatedRequest;
  const { username, name } = getRepositoryParams(req);

  const parsed = listPullRequestsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid pull request query', 400, 'INVALID_PULL_REQUEST_QUERY');
  }

  const pullRequests = await listPullRequests(
    username,
    name,
    optionalReq.userId,
    parsed.data.state as PullRequestState | undefined,
  );

  res.status(200).json({
    success: true,
    data: {
      pullRequests,
    },
  });
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  const optionalReq = req as OptionalAuthenticatedRequest;
  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const pullRequest = await getPullRequest(username, name, number, optionalReq.userId);

  res.status(200).json({
    success: true,
    data: {
      pullRequest,
    },
  });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const parsed = updatePullRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid pull request data', 400, 'INVALID_PULL_REQUEST_DATA');
  }

  const pullRequest = await updatePullRequest(
    authenticatedReq.userId,
    username,
    name,
    number,
    parsed.data,
  );

  res.status(200).json({
    success: true,
    data: {
      pullRequest,
    },
  });
};

export const getCommits = async (req: Request, res: Response): Promise<void> => {
  const optionalReq = req as OptionalAuthenticatedRequest;

  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const commits = await getPullRequestCommits(username, name, number, optionalReq.userId);

  res.status(200).json({
    success: true,
    data: {
      commits,
    },
  });
};

export const getDiff = async (req: Request, res: Response): Promise<void> => {
  const optionalReq = req as OptionalAuthenticatedRequest;

  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const comparison = await getPullRequestDiff(username, name, number, optionalReq.userId);

  res.status(200).json({
    success: true,
    data: {
      comparison,
    },
  });
};

export const getMergeability = async (req: Request, res: Response): Promise<void> => {
  const optionalReq = req as OptionalAuthenticatedRequest;

  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const mergeability = await getPullRequestMergeability(username, name, number, optionalReq.userId);

  res.status(200).json({
    success: true,
    data: {
      mergeability,
    },
  });
};

export const merge = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const { username, name } = getRepositoryParams(req);

  const number = getPullRequestNumber(req);

  const pullRequest = await mergePullRequest(authenticatedReq.userId, username, name, number);

  res.status(200).json({
    success: true,
    data: {
      pullRequest,
    },
  });
};
