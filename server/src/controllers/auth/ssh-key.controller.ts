import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../errors/app.error.js';

import { createSshKey, getSshKeys, revokeSshKey } from '../../services/auth/ssh-key.service.js';

import { createSshKeySchema } from '../../validations/auth/ssh-key.validation.js';

export const createSshKeyController = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const result = createSshKeySchema.safeParse(req.body);

  if (!result.success) {
    throw new AppError('Invalid SSH key data', 400, 'VALIDATION_ERROR');
  }

  const sshKey = await createSshKey(
    authenticatedReq.userId,
    result.data.name,
    result.data.publicKey,
  );

  res.status(201).json({
    success: true,
    data: {
      sshKey,
    },
  });
};

export const listSshKeysController = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const sshKeys = await getSshKeys(authenticatedReq.userId);

  res.status(200).json({
    success: true,
    data: {
      sshKeys,
    },
  });
};

export const revokeSshKeyController = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const keyId = req.params.keyId;

  if (typeof keyId !== 'string' || keyId.length === 0) {
    throw new AppError('SSH key ID is required', 400, 'SSH_KEY_ID_REQUIRED');
  }

  await revokeSshKey(authenticatedReq.userId, keyId);

  res.status(200).json({
    success: true,
    message: 'SSH key revoked successfully',
  });
};
