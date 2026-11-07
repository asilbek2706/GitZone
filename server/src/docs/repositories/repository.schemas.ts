import { z } from 'zod';

export const repositorySchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isPrivate: z.boolean(),
    defaultBranch: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Repository');

export const repositoryOwnerSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('RepositoryOwner');

export const repositoryWithOwnerSchema = repositorySchema
  .extend({
    owner: repositoryOwnerSchema,
  })
  .openapi('RepositoryWithOwner');

export const repositoryResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repository: repositorySchema,
    }),
  })
  .openapi('RepositoryResponse');

export const repositoryWithOwnerResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repository: repositoryWithOwnerSchema,
    }),
  })
  .openapi('RepositoryWithOwnerResponse');

export const repositoryListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      repositories: z.array(repositorySchema),
    }),
  })
  .openapi('RepositoryListResponse');

export const repositoryMessageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('RepositoryMessageResponse');

export const repositoryErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('RepositoryError');

export const repositoryCollaboratorPermissionSchema = z
  .enum(['READ', 'WRITE'])
  .openapi({
    description: 'Collaborator permission level.',
    example: 'WRITE',
  });

export const repositoryCollaboratorUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('RepositoryCollaboratorUser');

export const repositoryCollaboratorSchema = z
  .object({
    id: z.string(),
    permission: repositoryCollaboratorPermissionSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    user: repositoryCollaboratorUserSchema,
  })
  .openapi('RepositoryCollaborator');

export const repositoryCollaboratorResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      collaborator: repositoryCollaboratorSchema,
    }),
  })
  .openapi('RepositoryCollaboratorResponse');

export const repositoryCollaboratorListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      collaborators: z.array(repositoryCollaboratorSchema),
    }),
  })
  .openapi('RepositoryCollaboratorListResponse');

export const addRepositoryCollaboratorRequestSchema = z
  .object({
    username: z.string().trim().min(1).openapi({
      description: 'Username of the user to add as a collaborator.',
      example: 'john',
    }),
    permission: repositoryCollaboratorPermissionSchema,
  })
  .openapi('AddRepositoryCollaboratorRequest');

export const updateRepositoryCollaboratorRequestSchema = z
  .object({
    permission: repositoryCollaboratorPermissionSchema,
  })
  .openapi('UpdateRepositoryCollaboratorRequest');
