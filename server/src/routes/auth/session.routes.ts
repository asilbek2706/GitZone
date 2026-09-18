import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../middleware/rate-limit.middleware.js';
import {
  getSessions,
  revokeAllOtherSessions,
  revokeSessionById,
} from '../../controllers/auth/session.controller.js';

const router = Router();

router.get('/', authMiddleware, getSessions);

router.delete('/', authMiddleware, securityActionRateLimiter, revokeAllOtherSessions);

router.delete('/:sessionId', authMiddleware, securityActionRateLimiter, revokeSessionById);

export default router;
