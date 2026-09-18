import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { securityActionRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { createToken, listTokens, revokeToken } from '../../controllers/auth/token.controller.js';

const router = Router();

router.get('/', authMiddleware, listTokens);
router.post('/', authMiddleware, securityActionRateLimiter, createToken);
router.delete('/:tokenId', authMiddleware, securityActionRateLimiter, revokeToken);

export default router;
