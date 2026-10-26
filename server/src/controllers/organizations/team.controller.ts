import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '../../services/organizations/team.service.js';
import { organizationSlugSchema } from '../../validations/organizations/organization.validation.js';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from '../../validations/organizations/team.validation.js';

export const createTeamController = async (req: Request, res: Response): Promise<void> => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const input = createTeamSchema.safeParse(req.body);

  if (!input.success) {
    throw new AppError('Invalid team data', 400, 'INVALID_TEAM_DATA');
  }

  const actorId = (req as AuthenticatedRequest).userId;
  const team = await createTeam(slug.data, actorId, input.data);

  res.status(201).json({
    success: true,
    data: { team },
  });
};

export const updateTeamController = async (req: Request, res: Response): Promise<void> => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const teamId = typeof req.params.teamId === 'string' ? req.params.teamId.trim() : '';

  if (!teamId || teamId.length > 64) {
    throw new AppError('Invalid team ID', 400, 'INVALID_TEAM_ID');
  }

  const input = updateTeamSchema.safeParse(req.body);

  if (!input.success) {
    throw new AppError('Invalid team data', 400, 'INVALID_TEAM_DATA');
  }

  const actorId = (req as AuthenticatedRequest).userId;
  const team = await updateTeam(slug.data, teamId, actorId, input.data);

  res.status(200).json({
    success: true,
    data: { team },
  });
};

export const deleteTeamController = async (req: Request, res: Response): Promise<void> => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const teamId = typeof req.params.teamId === 'string' ? req.params.teamId.trim() : '';

  if (!teamId || teamId.length > 64) {
    throw new AppError('Invalid team ID', 400, 'INVALID_TEAM_ID');
  }

  const actorId = (req as AuthenticatedRequest).userId;

  const result = await deleteTeam(slug.data, teamId, actorId);

  res.status(200).json({
    success: true,
    data: { team: result },
  });
};

export const addTeamMemberController = async (req: Request, res: Response): Promise<void> => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const teamId = typeof req.params.teamId === 'string' ? req.params.teamId.trim() : '';

  if (!teamId || teamId.length > 64) {
    throw new AppError('Invalid team ID', 400, 'INVALID_TEAM_ID');
  }

  const input = addTeamMemberSchema.safeParse(req.body);

  if (!input.success) {
    throw new AppError('Invalid team member data', 400, 'INVALID_TEAM_MEMBER_DATA');
  }

  const actorId = (req as AuthenticatedRequest).userId;
  const member = await addTeamMember(slug.data, teamId, actorId, input.data.username);

  res.status(201).json({
    success: true,
    data: { member },
  });
};

export const removeTeamMemberController = async (req: Request, res: Response): Promise<void> => {
  const slug = organizationSlugSchema.safeParse(req.params.slug);

  if (!slug.success) {
    throw new AppError('Invalid organization slug', 400, 'INVALID_ORGANIZATION_SLUG');
  }

  const teamId = typeof req.params.teamId === 'string' ? req.params.teamId.trim() : '';

  if (!teamId || teamId.length > 64) {
    throw new AppError('Invalid team ID', 400, 'INVALID_TEAM_ID');
  }

  const targetUserId = req.params.userId;

  if (
    typeof targetUserId !== 'string' ||
    targetUserId.length === 0 ||
    targetUserId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(targetUserId)
  ) {
    throw new AppError('Invalid team member ID', 400, 'INVALID_TEAM_MEMBER_ID');
  }

  const actorId = (req as AuthenticatedRequest).userId;
  const result = await removeTeamMember(slug.data, teamId, actorId, targetUserId);

  res.status(200).json({ success: true, data: result });
};
