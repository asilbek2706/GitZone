import { Router } from 'express';

import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  getPreferences,
  updatePreferences,
} from '../controllers/notifications/notification.controller.js';

const router = Router();

router.get('/', authMiddleware, listNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.get('/preferences', authMiddleware, getPreferences);
router.patch('/preferences', authMiddleware, updatePreferences);
router.patch('/read-all', authMiddleware, markAllAsRead);
router.patch('/:notificationId/read', authMiddleware, markAsRead);

export default router;
