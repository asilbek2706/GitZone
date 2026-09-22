import { describe, expect, it } from 'vitest';

import { Prisma } from '../../../../src/generated/prisma/client.js';
import { isPrismaUniqueConstraintError } from '../../../../src/utils/prisma/errors.js';

describe('Prisma error utilities', () => {
  it('recognizes P2002 unique constraint errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
      },
    );

    expect(isPrismaUniqueConstraintError(error)).toBe(true);
  });

  it('rejects other known Prisma errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      {
        code: 'P2025',
        clientVersion: '7.10.0',
      },
    );

    expect(isPrismaUniqueConstraintError(error)).toBe(false);
  });

  it('rejects non-Prisma errors', () => {
    expect(isPrismaUniqueConstraintError(new Error('boom'))).toBe(false);
    expect(isPrismaUniqueConstraintError(null)).toBe(false);
  });
});
