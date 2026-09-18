import { Router } from 'express';

import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import { login, logout, me, refresh, register } from '../../controllers/auth/auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', refreshRateLimiter, logout);
router.post('/refresh', refreshRateLimiter, refresh);

router.get('/me', authMiddleware, me);

export default router;
