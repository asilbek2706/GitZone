import { z } from 'zod';

import {
  isSafeGitRefName,
} from '../../utils/git/ref-name.js';
import {
  isSafeGitTreePath,
} from '../../utils/git/tree-path.js';

const safeRef = z.string().min(1).max(255).refine(isSafeGitRefName);
const safePath = z.string().max(4096).refine(isSafeGitTreePath);

export const repositoryReadmeQuerySchema = z.object({
  ref: safeRef.optional(),
}).strict();

export const repositoryContentQuerySchema = z.object({
  ref: safeRef.optional(),
  path: safePath.optional(),
}).strict();

export const repositoryCommitsQuerySchema = z.object({
  ref: safeRef.optional(),
  path: safePath.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
}).strict().transform((value) => ({
  ref: value.ref,
  path: value.path,
  page: value.page,
  perPage: value.perPage ?? value.per_page ?? 30,
}));

export type RepositoryCommitsQuery =
  z.infer<typeof repositoryCommitsQuerySchema>;
