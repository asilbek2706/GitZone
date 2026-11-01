import { z } from 'zod';

export const teamRepositoryPermissionSchema = z.enum(['READ', 'WRITE']);

export const addTeamRepositorySchema = z.strictObject({
  repositoryId: z.string().trim().min(1, 'Repository ID is required'),
  permission: teamRepositoryPermissionSchema,
});

export const updateTeamRepositorySchema = z.strictObject({
  permission: teamRepositoryPermissionSchema,
});

export type AddTeamRepositoryInput = z.infer<typeof addTeamRepositorySchema>;
export type UpdateTeamRepositoryInput = z.infer<typeof updateTeamRepositorySchema>;
