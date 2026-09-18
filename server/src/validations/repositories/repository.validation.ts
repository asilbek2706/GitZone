import { z } from 'zod';

export const createRepositorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Repository name is required')
    .max(100, 'Repository name must be at most 100 characters')
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Repository name can only contain letters, numbers, dots, underscores and hyphens',
    ),

  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),

  isPrivate: z.boolean().optional(),
});

export const updateRepositorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Repository name is required')
    .max(100, 'Repository name must be at most 100 characters')
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Repository name can only contain letters, numbers, dots, underscores and hyphens',
    )
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .nullable()
    .optional(),

  isPrivate: z.boolean().optional(),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;

export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>;

export const addRepositoryCollaboratorSchema = z.object({
  username: z.string().trim().min(1, 'Collaborator username is required'),

  permission: z.enum(['READ', 'WRITE']),
});

export const updateRepositoryCollaboratorSchema = z.object({
  permission: z.enum(['READ', 'WRITE']),
});

export type AddRepositoryCollaboratorInput = z.infer<typeof addRepositoryCollaboratorSchema>;

export type UpdateRepositoryCollaboratorInput = z.infer<typeof updateRepositoryCollaboratorSchema>;
