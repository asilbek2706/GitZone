import { z } from 'zod';

const labelNameSchema = z.string().trim().min(1).max(50);

const labelColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid 6-digit HEX value')
  .transform((color) => color.toUpperCase());

const labelDescriptionSchema = z.string().trim().max(255).nullable().optional();

export const createLabelSchema = z
  .object({
    name: labelNameSchema,
    color: labelColorSchema,
    description: labelDescriptionSchema,
  })
  .strict();

export const updateLabelSchema = z
  .object({
    name: labelNameSchema.optional(),
    color: labelColorSchema.optional(),
    description: labelDescriptionSchema,
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.color !== undefined || data.description !== undefined,
    { message: 'At least one label field is required' },
  );

export const labelIdSchema = z.string().cuid();

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
