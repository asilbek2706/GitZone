import { z } from 'zod';

const branchSchema = z
  .string()
  .trim()
  .min(1, 'Branch is required')
  .max(255, 'Branch name is too long');

export const createPullRequestSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(256),
    description: z.string().trim().max(10_000).nullable().optional(),
    sourceBranch: branchSchema,
    targetBranch: branchSchema,
  })
  .refine((data) => data.sourceBranch !== data.targetBranch, {
    message: 'Source and target branches must be different',
    path: ['targetBranch'],
  });

export const updatePullRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    description: z.string().trim().max(10_000).nullable().optional(),
    state: z.enum(['OPEN', 'CLOSED']).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined || data.description !== undefined || data.state !== undefined,
    {
      message: 'At least one pull request field must be provided',
    },
  );

export const listPullRequestsQuerySchema = z.object({
  state: z.enum(['OPEN', 'CLOSED', 'MERGED']).optional(),
});

export const pullRequestNumberSchema = z.coerce.number().int().positive();

export type CreatePullRequestInput = z.infer<typeof createPullRequestSchema>;

export type UpdatePullRequestInput = z.infer<typeof updatePullRequestSchema>;
