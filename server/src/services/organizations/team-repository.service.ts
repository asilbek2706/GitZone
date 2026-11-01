import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import type {
  AddTeamRepositoryInput,
  UpdateTeamRepositoryInput,
} from '../../validations/organizations/team-repository.validation.js';

const requireOrganizationOwner = async (organizationId: string, actorId: string) => {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: actorId,
      },
    },
    select: { role: true },
  });

  if (!membership || membership.role !== 'OWNER') {
    throw new AppError(
      'Organization owner permission required',
      403,
      'ORGANIZATION_OWNER_REQUIRED',
    );
  }
};

const getOrganization = async (organizationSlug: string) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
  }

  return organization;
};

const getTeam = async (organizationId: string, teamId: string) => {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
    },
  });

  if (!team) {
    throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
  }

  return team;
};

const getRepository = async (organizationId: string, repositoryId: string) => {
  const repository = await prisma.repository.findFirst({
    where: {
      id: repositoryId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (!repository) {
    throw new AppError(
      'Organization repository not found',
      404,
      'ORGANIZATION_REPOSITORY_NOT_FOUND',
    );
  }

  return repository;
};

export const addTeamRepository = async (
  organizationSlug: string,
  teamId: string,
  actorId: string,
  input: AddTeamRepositoryInput,
) => {
  const organization = await getOrganization(organizationSlug);

  await requireOrganizationOwner(organization.id, actorId);

  const team = await getTeam(organization.id, teamId);
  const repository = await getRepository(organization.id, input.repositoryId);

  const existingAccess = await prisma.teamRepository.findUnique({
    where: {
      teamId_repositoryId: {
        teamId: team.id,
        repositoryId: repository.id,
      },
    },
    select: { id: true },
  });

  if (existingAccess) {
    throw new AppError(
      'Team already has access to this repository',
      409,
      'TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS',
    );
  }

  try {
    return await prisma.teamRepository.create({
      data: {
        teamId: team.id,
        repositoryId: repository.id,
        permission: input.permission,
      },
      select: {
        id: true,
        teamId: true,
        repositoryId: true,
        permission: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new AppError(
        'Team already has access to this repository',
        409,
        'TEAM_REPOSITORY_ACCESS_ALREADY_EXISTS',
      );
    }

    throw error;
  }
};

export const getTeamRepositories = async (
  organizationSlug: string,
  teamId: string,
  actorId: string,
) => {
  const organization = await getOrganization(organizationSlug);

  await requireOrganizationOwner(organization.id, actorId);

  const team = await getTeam(organization.id, teamId);

  return prisma.teamRepository.findMany({
    where: {
      teamId: team.id,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      teamId: true,
      repositoryId: true,
      permission: true,
      createdAt: true,
      updatedAt: true,
      repository: {
        select: {
          id: true,
          name: true,
          description: true,
          isPrivate: true,
        },
      },
    },
  });
};

export const updateTeamRepository = async (
  organizationSlug: string,
  teamId: string,
  repositoryId: string,
  actorId: string,
  input: UpdateTeamRepositoryInput,
) => {
  const organization = await getOrganization(organizationSlug);

  await requireOrganizationOwner(organization.id, actorId);

  const team = await getTeam(organization.id, teamId);
  const repository = await getRepository(organization.id, repositoryId);

  const existingAccess = await prisma.teamRepository.findUnique({
    where: {
      teamId_repositoryId: {
        teamId: team.id,
        repositoryId: repository.id,
      },
    },
    select: { id: true },
  });

  if (!existingAccess) {
    throw new AppError(
      'Team repository access not found',
      404,
      'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
    );
  }

  try {
    return await prisma.teamRepository.update({
      where: {
        id: existingAccess.id,
      },
      data: {
        permission: input.permission,
      },
      select: {
        id: true,
        teamId: true,
        repositoryId: true,
        permission: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      throw new AppError(
        'Team repository access not found',
        404,
        'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
      );
    }

    throw error;
  }
};

export const removeTeamRepository = async (
  organizationSlug: string,
  teamId: string,
  repositoryId: string,
  actorId: string,
): Promise<void> => {
  const organization = await getOrganization(organizationSlug);

  await requireOrganizationOwner(organization.id, actorId);

  const team = await getTeam(organization.id, teamId);
  const repository = await getRepository(organization.id, repositoryId);

  const existingAccess = await prisma.teamRepository.findUnique({
    where: {
      teamId_repositoryId: {
        teamId: team.id,
        repositoryId: repository.id,
      },
    },
    select: { id: true },
  });

  if (!existingAccess) {
    throw new AppError(
      'Team repository access not found',
      404,
      'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
    );
  }

  try {
    await prisma.teamRepository.delete({
      where: {
        id: existingAccess.id,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      throw new AppError(
        'Team repository access not found',
        404,
        'TEAM_REPOSITORY_ACCESS_NOT_FOUND',
      );
    }

    throw error;
  }
};
