import { z } from 'zod';

export const submitPullRequestReviewSchema = z
  .object({
    state: z.enum(['COMMENTED', 'APPROVED', 'CHANGES_REQUESTED']),
    body: z.string().trim().max(10_000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.state === 'COMMENTED' || data.state === 'CHANGES_REQUESTED') &&
      (!data.body || data.body.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['body'],
        message: 'A review body is required for this review state',
      });
    }
  });

export const createGeneralPullRequestCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required').max(10_000),
});

export type SubmitPullRequestReviewInput = z.infer<typeof submitPullRequestReviewSchema>;

export type CreateGeneralPullRequestCommentInput = z.infer<
  typeof createGeneralPullRequestCommentSchema
>;
export const createInlinePullRequestCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required').max(10_000),
  path: z.string().trim().min(1, 'Path is required').max(4096),
  line: z.coerce.number().int().positive(),
  side: z.enum(['LEFT', 'RIGHT']),
});

export const updatePullRequestReviewCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required').max(10_000),
});

export const conversationIdSchema = z.string().trim().min(1).max(128);

export const reviewCommentIdSchema = z.string().trim().min(1).max(128);

export type CreateInlinePullRequestCommentInput = z.infer<
  typeof createInlinePullRequestCommentSchema
>;

export type UpdatePullRequestReviewCommentInput = z.infer<
  typeof updatePullRequestReviewCommentSchema
>;
