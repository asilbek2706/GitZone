import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { verifyTwoFactorLogin } from '../../controllers/auth/two-factor/login-challenge.controller.js';
import { verifyTwoFactorRecoveryLoginController } from '../../controllers/auth/two-factor/recovery-login.controller.js';
import { setupTwoFactor } from '../../controllers/auth/two-factor/setup.controller.js';
import { verifyTwoFactor } from '../../controllers/auth/two-factor/verify.controller.js';

const router = Router();

router.post('/setup', authMiddleware, securityActionRateLimiter, setupTwoFactor);
router.post('/verify', authMiddleware, securityActionRateLimiter, verifyTwoFactor);
router.post('/login/verify', securityActionRateLimiter, verifyTwoFactorLogin);
router.post(
  '/login/recovery',
  securityActionRateLimiter,
  verifyTwoFactorRecoveryLoginController,
);

export default router;
