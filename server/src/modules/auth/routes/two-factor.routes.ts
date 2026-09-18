import { Router } from 'express';

import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../../middleware/rate-limit.middleware.js';
import { setupTwoFactor, verifyTwoFactor } from '../auth.controller.js';

const router = Router();

router.post('/setup', authMiddleware, securityActionRateLimiter, setupTwoFactor);

router.post('/verify', authMiddleware, securityActionRateLimiter, verifyTwoFactor);

export default router;
