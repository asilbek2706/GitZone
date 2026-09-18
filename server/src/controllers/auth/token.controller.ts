import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';
import {
  createPersonalAccessToken,
  getPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../../services/auth/pat.service.js';
import { createPersonalAccessTokenSchema } from '../../validations/auth/token.validation.js';

export const createToken = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const result = createPersonalAccessTokenSchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const personalAccessToken = await createPersonalAccessToken(
    authenticatedReq.userId,
    result.data.name,
    result.data.expiresAt ? new Date(result.data.expiresAt) : null,
  );

  res.status(201).json({
    success: true,
    data: {
      token: personalAccessToken.token,
      id: personalAccessToken.id,
      name: personalAccessToken.name,
      expiresAt: personalAccessToken.expiresAt,
      createdAt: personalAccessToken.createdAt,
    },
  });
};

export const listTokens = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const personalAccessTokens = await getPersonalAccessTokens(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      tokens: personalAccessTokens,
    },
  });
};

export const revokeToken = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const tokenId = req.params.tokenId;

  if (typeof tokenId !== 'string') {
    throw new AppError(
      'Personal access token ID is required',
      400,
      'PERSONAL_ACCESS_TOKEN_ID_REQUIRED',
    );
  }

  await revokePersonalAccessToken(authenticatedReq.userId, tokenId);

  res.status(200).json({
    success: true,
    message: 'Personal access token revoked successfully',
  });
};
