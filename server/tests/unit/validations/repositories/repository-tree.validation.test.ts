import { describe, expect, it } from 'vitest';

import { repositoryTreeQuerySchema } from '../../../../src/validations/repositories/repository-tree.validation.js';

describe('repository tree validation', () => {
  it('defaults to repository root', () => {
    const result = repositoryTreeQuerySchema.parse({});

    expect(result).toEqual({
      path: '',
    });
  });

  it('accepts branch and nested path', () => {
    expect(
      repositoryTreeQuerySchema.safeParse({
        ref: 'feature/tree-api',
        path: 'src/services/git',
      }).success,
    ).toBe(true);
  });

  it.each([
    '../main',
    'bad ref',
    'feature..test',
    '.hidden/main',
    'feature//test',
    'branch.lock',
    'bad~ref',
    'bad^ref',
    'bad:ref',
    'bad?ref',
    'bad*ref',
    'bad[ref',
    'bad\\ref',
  ])('rejects unsafe ref "%s"', (ref) => {
    expect(
      repositoryTreeQuerySchema.safeParse({
        ref,
      }).success,
    ).toBe(false);
  });

  it.each([
    '/src',
    'src/',
    'src//services',
    'src/./services',
    'src/../services',
    'src\\services',
    'src/\u0000secret',
  ])('rejects unsafe path "%s"', (path) => {
    expect(
      repositoryTreeQuerySchema.safeParse({
        path,
      }).success,
    ).toBe(false);
  });

  it('rejects unknown query fields', () => {
    expect(
      repositoryTreeQuerySchema.safeParse({
        path: '',
        unknown: 'value',
      }).success,
    ).toBe(false);
  });
});
