import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../middleware/rate-limit.middleware.js';

import {
  createSshKeyController,
  listSshKeysController,
  revokeSshKeyController,
} from '../../controllers/auth/ssh-key.controller.js';

const router = Router();

router.get('/', authMiddleware, listSshKeysController);

router.post('/', authMiddleware, securityActionRateLimiter, createSshKeyController);

router.delete('/:keyId', authMiddleware, securityActionRateLimiter, revokeSshKeyController);

export default router;
