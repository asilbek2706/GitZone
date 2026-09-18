import { Router } from 'express';

import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import { me } from '../../controllers/auth/current-user.controller.js';
import { login } from '../../controllers/auth/login.controller.js';
import { logout } from '../../controllers/auth/logout.controller.js';
import { refresh } from '../../controllers/auth/refresh.controller.js';
import { register } from '../../controllers/auth/register.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', refreshRateLimiter, logout);
router.post('/refresh', refreshRateLimiter, refresh);

router.get('/me', authMiddleware, me);

export default router;
