import prisma from '../../config/prisma.js';
import { hashRefreshToken } from '../../utils/auth/tokens.js';

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
