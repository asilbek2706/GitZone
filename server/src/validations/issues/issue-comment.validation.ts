import { z } from 'zod';

export const createIssueCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(10_000),
  })
  .strict();

export const updateIssueCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(10_000),
  })
  .strict();

export const issueCommentIdSchema = z.string().min(1).max(128);

export const listIssueCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIssueCommentInput = z.infer<typeof createIssueCommentSchema>;

export type UpdateIssueCommentInput = z.infer<typeof updateIssueCommentSchema>;

export type ListIssueCommentsQuery = z.infer<typeof listIssueCommentsQuerySchema>;
