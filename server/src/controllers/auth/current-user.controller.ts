import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { getCurrentUser } from '../../services/auth/current-user.service.js';

export const me = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const user = await getCurrentUser(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};
