import { z } from 'zod';

const milestoneTitleSchema = z.string().trim().min(1).max(256);

const milestoneDescriptionSchema = z.string().trim().max(10_000).nullable().optional();

const milestoneDueDateSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const milestoneStateSchema = z.enum(['OPEN', 'CLOSED']);

export const createMilestoneSchema = z
  .object({
    title: milestoneTitleSchema,
    description: milestoneDescriptionSchema,
    dueDate: milestoneDueDateSchema,
  })
  .strict();

export const updateMilestoneSchema = z
  .object({
    title: milestoneTitleSchema.optional(),
    description: milestoneDescriptionSchema,
    dueDate: milestoneDueDateSchema,
    state: milestoneStateSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.dueDate !== undefined ||
      data.state !== undefined,
    { message: 'At least one milestone field is required' },
  );

export const listMilestonesQuerySchema = z
  .object({
    state: milestoneStateSchema.optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const milestoneIdSchema = z.string().cuid();

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export type ListMilestonesQuery = z.infer<typeof listMilestonesQuerySchema>;
