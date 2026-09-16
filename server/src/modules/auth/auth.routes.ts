import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  securityActionRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import {
  createToken,
  getSessions,
  listTokens,
  login,
  logout,
  me,
  refresh,
  register,
  revokeAllOtherSessions,
  revokeSessionById,
  revokeToken,
} from './auth.controller.js';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', refreshRateLimiter, logout);
router.post('/refresh', refreshRateLimiter, refresh);

router.get('/me', authMiddleware, me);

router.get('/sessions', authMiddleware, getSessions);
router.delete('/sessions', authMiddleware, securityActionRateLimiter, revokeAllOtherSessions);
router.delete('/sessions/:sessionId', authMiddleware, securityActionRateLimiter, revokeSessionById);

router.get('/tokens', authMiddleware, listTokens);
router.post('/tokens', authMiddleware, securityActionRateLimiter, createToken);
router.delete('/tokens/:tokenId', authMiddleware, securityActionRateLimiter, revokeToken);

export default router;
