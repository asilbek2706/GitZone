import type { Request, Response } from 'express';

import { AppError } from '../../errors/app.error.js';
import type { OptionalAuthenticatedRequest } from '../../middleware/optional-auth.middleware.js';
import {
  getGitBlobContent,
  getGitBlobContentBySha,
} from '../../services/git/git-content.service.js';
import { getGitCommit, listGitCommits } from '../../services/git/git-commit.service.js';
import { getGitRepositoryRefs } from '../../services/git/git-ref.service.js';
import { authorizeRepositoryContentRead } from '../../services/repositories/repository-content-access.service.js';
import {
  repositoryCommitsQuerySchema,
  repositoryContentQuerySchema,
} from '../../validations/repositories/repository-git.validation.js';

const repositoryParams = (req: Request): { username: string; name: string } => {
  const { username, name } = req.params;
  if (typeof username !== 'string' || typeof name !== 'string') {
    throw new AppError('Username and repository name are required', 400, 'INVALID_REPOSITORY_PARAMS');
  }
  return { username, name };
};

const authorize = async (req: Request) => {
  const { username, name } = repositoryParams(req);
  const userId = (req as OptionalAuthenticatedRequest).userId;
  const access = await authorizeRepositoryContentRead(username, name, userId);
  return { access, username, name };
};

export const getBranches = async (req: Request, res: Response): Promise<void> => {
  const { access } = await authorize(req);
  const refs = await getGitRepositoryRefs(access.repositoryOwnerUsername, access.repositoryName);
  res.status(200).json({ success: true, data: { branches: refs.branches, defaultBranch: refs.defaultBranch } });
};

export const getContent = async (req: Request, res: Response): Promise<void> => {
  const parsed = repositoryContentQuerySchema.safeParse(req.query);
  if (!parsed.success || parsed.data.path === undefined) {
    throw new AppError('A valid file path is required', 400, 'INVALID_GIT_FILE_PATH');
  }
  const { access } = await authorize(req);
  const content = await getGitBlobContent(access.repositoryOwnerUsername, access.repositoryName, parsed.data.ref, parsed.data.path);
  res.status(200).json({ success: true, data: { content } });
};

export const getCommits = async (req: Request, res: Response): Promise<void> => {
  const parsed = repositoryCommitsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Invalid repository commits query', 400, 'INVALID_REPOSITORY_COMMITS_QUERY');
  }
  const { access } = await authorize(req);
  const commits = await listGitCommits(
    access.repositoryOwnerUsername,
    access.repositoryName,
    parsed.data.ref,
    parsed.data.path,
    parsed.data.page,
    parsed.data.perPage,
  );
  res.status(200).json({ success: true, data: { commits } });
};

export const getBlob = async (req: Request, res: Response): Promise<void> => {
  const { sha } = req.params;
  if (typeof sha !== 'string') {
    throw new AppError('Blob SHA is required', 400, 'INVALID_GIT_BLOB_SHA');
  }
  const { access } = await authorize(req);
  const blob = await getGitBlobContentBySha(access.repositoryOwnerUsername, access.repositoryName, sha);
  res.status(200).json({ success: true, data: { blob } });
};

export const getCommit = async (req: Request, res: Response): Promise<void> => {
  const { sha } = req.params;
  if (typeof sha !== 'string') {
    throw new AppError('Commit SHA is required', 400, 'INVALID_GIT_COMMIT_SHA');
  }
  const { access } = await authorize(req);
  const commit = await getGitCommit(access.repositoryOwnerUsername, access.repositoryName, sha);
  res.status(200).json({ success: true, data: { commit } });
};
