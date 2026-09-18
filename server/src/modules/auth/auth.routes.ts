import { Router } from 'express';

import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import tokenRoutes from './routes/token.routes.js';
import twoFactorRoutes from './routes/two-factor.routes.js';

const router = Router();

router.use('/', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/tokens', tokenRoutes);
router.use('/2fa', twoFactorRoutes);

export default router;
