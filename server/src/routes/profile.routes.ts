import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';

import {
  getProfile,
  getProfileActivity,
  getProfileContributions,
  getProfileRepositories,
  updateProfile,
} from '../controllers/profiles/profile.controller.js';

const router = Router();

router.patch('/me', authMiddleware, updateProfile);

router.get('/:username/repositories', getProfileRepositories);
router.get('/:username/activity', getProfileActivity);
router.get('/:username/contributions', getProfileContributions);

router.get('/:username', getProfile);

export default router;
