import type { Request, Response } from 'express';

import { AppError } from '../../errors/app.error.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/notifications/notification.service.js';
import {
  listNotificationsQuerySchema,
  notificationIdSchema,
  updateNotificationPreferencesSchema,
} from '../../validations/notifications/notification.validation.js';

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const parsed = listNotificationsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid notification query', 400, 'INVALID_NOTIFICATION_QUERY');
  }

  const notifications = await getNotifications(
    authenticatedReq.userId,
    parsed.data.limit,
    parsed.data.cursor,
  );

  res.status(200).json({ success: true, data: { notifications } });
};

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const count = await getUnreadNotificationCount(authenticatedReq.userId);

  res.status(200).json({ success: true, data: { count } });
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const parsed = notificationIdSchema.safeParse(req.params.notificationId);

  if (!parsed.success) {
    throw new AppError('Invalid notification ID', 400, 'INVALID_NOTIFICATION_ID');
  }

  const result = await markNotificationAsRead(authenticatedReq.userId, parsed.data);

  if (result.count === 0) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  res.status(200).json({ success: true });
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  await markAllNotificationsAsRead(authenticatedReq.userId);

  res.status(200).json({ success: true });
};

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const preferences = await getNotificationPreferences(authenticatedReq.userId);

  res.status(200).json({ success: true, data: { preferences } });
};

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const parsed = updateNotificationPreferencesSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid notification preferences', 400, 'INVALID_NOTIFICATION_PREFERENCES');
  }

  const preferences = await updateNotificationPreferences(
    authenticatedReq.userId,
    parsed.data,
  );

  res.status(200).json({ success: true, data: { preferences } });
};
