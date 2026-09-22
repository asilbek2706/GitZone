import { describe, expect, it } from 'vitest';

import {
  createRepositorySchema,
  updateRepositorySchema,
} from '../../../../src/validations/repositories/repository.validation.js';

describe('repository validation', () => {
  describe('createRepositorySchema', () => {
    it.each([
      'demo',
      'my-repository',
      'my_repository',
      'repository.v2',
      'repo-123',
      'A1_B2-C3',
    ])('accepts valid repository name "%s"', (name) => {
      const result = createRepositorySchema.safeParse({
        name,
      });

      expect(result.success).toBe(true);
    });

    it('trims repository name', () => {
      const result = createRepositorySchema.safeParse({
        name: '  demo  ',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('demo');
      }
    });

    it.each(['.', '..', '.git', '.GIT'])(
      'rejects reserved repository name "%s"',
      (name) => {
        const result = createRepositorySchema.safeParse({
          name,
        });

        expect(result.success).toBe(false);
      },
    );

    it.each(['demo.git', 'demo.GIT', 'repository.Git'])(
      'rejects repository name ending with .git: "%s"',
      (name) => {
        const result = createRepositorySchema.safeParse({
          name,
        });

        expect(result.success).toBe(false);
      },
    );

    it.each(['demo..repo', 'foo..bar', 'repo...name'])(
      'rejects repository name containing consecutive dots: "%s"',
      (name) => {
        const result = createRepositorySchema.safeParse({
          name,
        });

        expect(result.success).toBe(false);
      },
    );

    it.each([
      '../demo',
      'demo/repo',
      'demo\\repo',
      '/demo',
      'demo repo',
      'demo@repo',
      'demo:repo',
    ])('rejects unsafe repository name "%s"', (name) => {
      const result = createRepositorySchema.safeParse({
        name,
      });

      expect(result.success).toBe(false);
    });

    it('rejects an empty repository name', () => {
      const result = createRepositorySchema.safeParse({
        name: '',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a repository name longer than 100 characters', () => {
      const result = createRepositorySchema.safeParse({
        name: 'a'.repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it('accepts a repository name with exactly 100 characters', () => {
      const result = createRepositorySchema.safeParse({
        name: 'a'.repeat(100),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateRepositorySchema', () => {
    it('allows an update without changing repository name', () => {
      const result = updateRepositorySchema.safeParse({
        description: 'Updated description',
        isPrivate: true,
      });

      expect(result.success).toBe(true);
    });

    it.each([
      '.',
      '..',
      '.git',
      'demo.git',
      'demo..repo',
      '../demo',
      'demo/repo',
    ])('applies repository name security rules during rename: "%s"', (name) => {
      const result = updateRepositorySchema.safeParse({
        name,
      });

      expect(result.success).toBe(false);
    });

    it('accepts a valid repository rename', () => {
      const result = updateRepositorySchema.safeParse({
        name: 'new-repository-name',
      });

      expect(result.success).toBe(true);
    });

    it('allows description to be cleared with null', () => {
      const result = updateRepositorySchema.safeParse({
        description: null,
      });

      expect(result.success).toBe(true);
    });
  });
});
