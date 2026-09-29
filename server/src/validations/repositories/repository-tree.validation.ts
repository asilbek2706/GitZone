import { z } from 'zod';

import {
  isSafeGitTreePath,
} from '../../utils/git/tree-path.js';

const isSafeGitRefName = (
  value: string,
): boolean => {
  if (
    value.length === 0 ||
    value.length > 255 ||
    value === '@' ||
    value.startsWith('-') ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('//') ||
    value.includes('@{')
  ) {
    return false;
  }

  for (const character of value) {
    const code =
      character.charCodeAt(0);

    if (
      code <= 0x20 ||
      code === 0x7f ||
      character === '~' ||
      character === '^' ||
      character === ':' ||
      character === '?' ||
      character === '*' ||
      character === '[' ||
      character === '\\'
    ) {
      return false;
    }
  }

  return value
    .split('/')
    .every(
      (component) =>
        component.length > 0 &&
        !component.startsWith('.') &&
        !component
          .toLowerCase()
          .endsWith('.lock'),
    );
};

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
