import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedGetNotifications,
  mockedGetUnreadNotificationCount,
  mockedMarkNotificationAsRead,
  mockedMarkAllNotificationsAsRead,
} = vi.hoisted(() => ({
  mockedGetNotifications: vi.fn(),
  mockedGetUnreadNotificationCount: vi.fn(),
  mockedMarkNotificationAsRead: vi.fn(),
  mockedMarkAllNotificationsAsRead: vi.fn(),
}));

vi.mock('../../../src/controllers/git/git-http.controller.js', () => ({
  gitHttpController: vi.fn(),
}));

vi.mock('../../../src/middleware/auth.middleware.js', () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    (req as Request & { userId: string }).userId = 'user-1';
    next();
  },
}));

vi.mock('../../../src/services/notifications/notification.service.js', () => ({
  getNotifications: mockedGetNotifications,
  getUnreadNotificationCount: mockedGetUnreadNotificationCount,
  markNotificationAsRead: mockedMarkNotificationAsRead,
  markAllNotificationsAsRead: mockedMarkAllNotificationsAsRead,
}));

const { default: app } = await import('../../../src/app.js');
const { AppError } = await import('../../../src/errors/app.error.js');

const baseEndpoint = '/api/notifications';

describe('Notification API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('requires authentication', async () => {
      await request(app).get(baseEndpoint).expect(401);

      expect(mockedGetNotifications).not.toHaveBeenCalled();
    });

    it('returns notifications for the authenticated user', async () => {
      mockedGetNotifications.mockResolvedValue([
        { id: 'notification-1', title: 'New issue', type: 'ISSUE' },
      ]);

      const response = await request(app)
        .get(baseEndpoint)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          notifications: [{ id: 'notification-1', title: 'New issue' }],
        },
      });

      expect(mockedGetNotifications).toHaveBeenCalledWith('user-1', 20, undefined);
    });

    it('rejects an invalid limit', async () => {
      const response = await request(app)
        .get(`${baseEndpoint}?limit=101`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_NOTIFICATION_QUERY');
      expect(mockedGetNotifications).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid cursor', async () => {
      mockedGetNotifications.mockRejectedValue(
        new AppError('Invalid notification cursor', 400, 'INVALID_NOTIFICATION_CURSOR'),
      );

      const response = await request(app)
        .get(`${baseEndpoint}?cursor=foreign-cursor`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_NOTIFICATION_CURSOR');
      expect(mockedGetNotifications).toHaveBeenCalledWith('user-1', 20, 'foreign-cursor');
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('requires authentication', async () => {
      await request(app).get(`${baseEndpoint}/unread-count`).expect(401);

      expect(mockedGetUnreadNotificationCount).not.toHaveBeenCalled();
    });

    it('returns unread count for the authenticated user', async () => {
      mockedGetUnreadNotificationCount.mockResolvedValue(5);

      const response = await request(app)
        .get(`${baseEndpoint}/unread-count`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { count: 5 },
      });
      expect(mockedGetUnreadNotificationCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('PATCH /api/notifications/:notificationId/read', () => {
    it('requires authentication', async () => {
      await request(app).patch(`${baseEndpoint}/notification-1/read`).expect(401);

      expect(mockedMarkNotificationAsRead).not.toHaveBeenCalled();
    });

    it('marks the authenticated user notification as read', async () => {
      mockedMarkNotificationAsRead.mockResolvedValue({ count: 1 });

      await request(app)
        .patch(`${baseEndpoint}/notification-1/read`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockedMarkNotificationAsRead).toHaveBeenCalledWith('user-1', 'notification-1');
    });

    it('returns 404 when the notification does not belong to the user', async () => {
      mockedMarkNotificationAsRead.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .patch(`${baseEndpoint}/foreign-notification/read`)
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
      expect(mockedMarkNotificationAsRead).toHaveBeenCalledWith('user-1', 'foreign-notification');
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('requires authentication', async () => {
      await request(app).patch(`${baseEndpoint}/read-all`).expect(401);

      expect(mockedMarkAllNotificationsAsRead).not.toHaveBeenCalled();
    });

    it('marks all notifications as read for the authenticated user', async () => {
      mockedMarkAllNotificationsAsRead.mockResolvedValue({ count: 3 });

      await request(app)
        .patch(`${baseEndpoint}/read-all`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockedMarkAllNotificationsAsRead).toHaveBeenCalledWith('user-1');
    });
  });
});
