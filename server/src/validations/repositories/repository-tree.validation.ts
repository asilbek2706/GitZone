import { z } from 'zod';

import {
  isSafeGitTreePath,
} from '../../utils/git/tree-path.js';
import {
  isSafeGitRefName,
} from '../../utils/git/ref-name.js';

export const repositoryTreeQuerySchema =
  z
    .object({
      ref: z
        .string()
        .min(1)
        .max(255)
        .refine(
          isSafeGitRefName,
          'Invalid Git reference',
        )
        .optional(),

      path: z
        .string()
        .max(4096)
        .refine(
          isSafeGitTreePath,
          'Invalid Git tree path',
        )
        .optional()
        .default(''),
    })
    .strict();

export type RepositoryTreeQuery =
  z.infer<
    typeof repositoryTreeQuerySchema
  >;
