import type { Request, Response } from 'express';

import { AppError } from '../../errors/app.error.js';
import { registerUser } from '../../services/auth/register.service.js';
import { setRefreshTokenCookie } from '../../utils/auth/cookies.js';
import { getSessionMetadata } from '../../utils/auth/request.js';
import { registerSchema } from '../../validations/auth/register.validation.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const auth = await registerUser(
    {
      username: result.data.username,
      email: result.data.email,
      password: result.data.password,
      ...(result.data.name !== undefined ? { name: result.data.name } : {}),
    },
    getSessionMetadata(req),
  );

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};
