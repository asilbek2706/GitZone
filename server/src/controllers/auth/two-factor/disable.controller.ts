import type { Request, Response } from 'express';

import { AppError } from '../../../errors/app.error.js';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { disableTwoFactorAuthentication } from '../../../services/auth/two-factor/disable.service.js';
import { disableTwoFactorSchema } from '../../../validations/auth/two-factor/disable.validation.js';

export const disableTwoFactor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const parsed = disableTwoFactorSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  await disableTwoFactorAuthentication(
    authenticatedReq.userId,
    parsed.data.password,
    parsed.data.code,
  );

  res.status(200).json({
    success: true,
    message: 'Two-factor authentication disabled successfully',
  });
};
