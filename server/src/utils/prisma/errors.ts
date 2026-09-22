import { Prisma } from '../../generated/prisma/client.js';

export const isPrismaUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
