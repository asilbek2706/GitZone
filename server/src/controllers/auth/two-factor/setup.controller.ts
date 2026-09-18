import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { setupTwoFactorAuthentication } from '../../../services/auth/two-factor/two-factor.service.js';

export const setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const setup = await setupTwoFactorAuthentication(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: setup,
  });
};
