import { Router } from 'express';

import authRoutes from './auth/auth.routes.js';
import sessionRoutes from './auth/session.routes.js';
import tokenRoutes from './auth/token.routes.js';
import twoFactorRoutes from './auth/two-factor.routes.js';

const router = Router();

router.use('/', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/tokens', tokenRoutes);
router.use('/2fa', twoFactorRoutes);

export default router;
