import { z } from 'zod';

export const createIssueSchema = z
  .object({
    title: z.string().trim().min(1).max(256),
    body: z.string().trim().max(10_000).nullable().optional(),
  })
  .strict();

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const issueNumberSchema = z.coerce.number().int().positive().safe();

export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    body: z.string().trim().max(10_000).nullable().optional(),
    state: z.enum(['OPEN', 'CLOSED']).optional(),
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.body !== undefined || data.state !== undefined,
    { message: 'At least one issue field is required' },
  );

export const listIssuesQuerySchema = z.object({
  state: z.enum(['OPEN', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
