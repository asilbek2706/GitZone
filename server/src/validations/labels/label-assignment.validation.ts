import { z } from 'zod';

import { issueNumberSchema } from '../issues/issue.validation.js';
import { labelIdSchema } from './label.validation.js';

export const assignLabelSchema = z
  .object({
    labelId: labelIdSchema,
  })
  .strict();

export const labelAssignmentNumberSchema = issueNumberSchema;

export const labelAssignmentIdSchema = labelIdSchema;

export type AssignLabelInput = z.infer<typeof assignLabelSchema>;
