import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { setupTwoFactor } from '../../controllers/auth/two-factor/setup.controller.js';
import { verifyTwoFactor } from '../../controllers/auth/two-factor/verify.controller.js';

const router = Router();

router.post('/setup', authMiddleware, securityActionRateLimiter, setupTwoFactor);

router.post('/verify', authMiddleware, securityActionRateLimiter, verifyTwoFactor);

export default router;
