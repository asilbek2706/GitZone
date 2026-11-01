import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import {
  addTeamRepository,
  getTeamRepositories,
  removeTeamRepository,
  updateTeamRepository,
} from '../../services/organizations/team-repository.service.js';
import { organizationSlugSchema } from '../../validations/organizations/organization.validation.js';
import {
  addTeamRepositorySchema,
  updateTeamRepositorySchema,
} from '../../validations/organizations/team-repository.validation.js';

const getParams = (req: Request) => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const { teamId, repositoryId } = req.params;

  if (typeof teamId !== 'string' || teamId.trim().length === 0) {
    throw new AppError('Team ID is required', 400, 'INVALID_TEAM_PARAMS');
  }

  if (repositoryId !== undefined && (typeof repositoryId !== 'string' || repositoryId.trim().length === 0)) {
    throw new AppError('Repository ID is required', 400, 'INVALID_REPOSITORY_PARAMS');
  }

  return {
    slug: slug.data,
    teamId,
    repositoryId,
  };
};

export const addTeamRepositoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { slug, teamId } = getParams(req);

  const parsed = addTeamRepositorySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid team repository data', 400, 'INVALID_TEAM_REPOSITORY_DATA');
  }

  const access = await addTeamRepository(
    slug,
    teamId,
    authenticatedReq.userId,
    parsed.data,
  );

  res.status(201).json({
    success: true,
    data: { access },
  });
};

export const listTeamRepositoriesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { slug, teamId } = getParams(req);

  const repositories = await getTeamRepositories(slug, teamId, authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: { repositories },
  });
};

export const updateTeamRepositoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { slug, teamId, repositoryId } = getParams(req);

  if (!repositoryId) {
    throw new AppError('Repository ID is required', 400, 'INVALID_REPOSITORY_PARAMS');
  }

  const parsed = updateTeamRepositorySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid team repository data', 400, 'INVALID_TEAM_REPOSITORY_DATA');
  }

  const access = await updateTeamRepository(
    slug,
    teamId,
    repositoryId,
    authenticatedReq.userId,
    parsed.data,
  );

  res.status(200).json({
    success: true,
    data: { access },
  });
};

export const removeTeamRepositoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { slug, teamId, repositoryId } = getParams(req);

  if (!repositoryId) {
    throw new AppError('Repository ID is required', 400, 'INVALID_REPOSITORY_PARAMS');
  }

  await removeTeamRepository(
    slug,
    teamId,
    repositoryId,
    authenticatedReq.userId,
  );

  res.status(200).json({
    success: true,
    message: 'Team repository access removed successfully',
  });
};
