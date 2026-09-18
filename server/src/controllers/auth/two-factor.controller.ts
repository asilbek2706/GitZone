import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import {
  setupTwoFactorAuthentication,
  verifyTwoFactorSetup,
} from '../../services/auth/two-factor/two-factor.service.js';
import { verifyTwoFactorSetupSchema } from '../../validations/auth/auth.validation.js';

export const setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const setup = await setupTwoFactorAuthentication(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: setup,
  });
};

export const verifyTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const parsed = verifyTwoFactorSetupSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const result = await verifyTwoFactorSetup(authenticatedReq.userId, parsed.data.code);

  res.status(200).json({
    success: true,
    data: result,
  });
};
