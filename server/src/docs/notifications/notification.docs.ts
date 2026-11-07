import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

import { openApiRegistry } from '../../config/openapi.registry.js';

import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  updateNotificationPreferencesRequestSchema,
  notificationListResponseSchema,
  notificationUnreadCountResponseSchema,
  notificationPreferencesResponseSchema,
  notificationSuccessResponseSchema,
  notificationErrorSchema,
} from './notification.schemas.js';

extendZodWithOpenApi(z);

const base = '/api/notifications';

const bearerSecurity = [{ bearerAuth: [] }];

const commonErrors = {
  400: {
    description: 'Invalid request data or pagination cursor.',
    content: {
      'application/json': {
        schema: notificationErrorSchema,
      },
    },
  },
  401: {
    description: 'Authentication required.',
    content: {
      'application/json': {
        schema: notificationErrorSchema,
      },
    },
  },
  404: {
    description: 'Notification not found.',
    content: {
      'application/json': {
        schema: notificationErrorSchema,
      },
    },
  },
};

const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

type PathConfig = Parameters<typeof openApiRegistry.registerPath>[0];

const registerNotificationPath = (
  path: string,
  method: PathConfig['method'],
  operationId: string,
  summary: string,
  request?: PathConfig['request'],
  responseSchema: z.ZodType = notificationSuccessResponseSchema,
  description?: string,
) => {
  openApiRegistry.registerPath({
    method,
    path,
    tags: ['Notifications'],
    operationId,
    summary,
    ...(description ? { description } : {}),
    security: bearerSecurity,
    ...(request ? { request } : {}),
    responses: {
      200: jsonResponse('Successful response.', responseSchema),
      ...commonErrors,
    },
  });
};

// ==========================================
// GET /api/notifications
// ==========================================

registerNotificationPath(
  `${base}`,
  'get',
  'listNotifications',
  'List notifications',
  {
    query: listNotificationsQuerySchema,
  },
  notificationListResponseSchema,
  'Returns the authenticated user notifications ordered by creation date in descending order. Supports cursor-based pagination. The default limit is 20 and the maximum is 100.',
);

// ==========================================
// GET /api/notifications/unread-count
// ==========================================

registerNotificationPath(
  `${base}/unread-count`,
  'get',
  'getUnreadNotificationCount',
  'Get unread notification count',
  undefined,
  notificationUnreadCountResponseSchema,
  'Returns the total number of unread notifications belonging to the authenticated user.',
);

// ==========================================
// GET /api/notifications/preferences
// ==========================================

registerNotificationPath(
  `${base}/preferences`,
  'get',
  'getNotificationPreferences',
  'Get notification preferences',
  undefined,
  notificationPreferencesResponseSchema,
  'Returns the authenticated user notification preferences. Default preferences are created automatically when none exist.',
);

// ==========================================
// PATCH /api/notifications/preferences
// ==========================================

registerNotificationPath(
  `${base}/preferences`,
  'patch',
  'updateNotificationPreferences',
  'Update notification preferences',
  {
    body: {
      content: {
        'application/json': {
          schema: updateNotificationPreferencesRequestSchema,
        },
      },
    },
  },
  notificationPreferencesResponseSchema,
  'Updates one or more notification preferences. Only supplied fields are updated. At least one preference must be provided.',
);

// ==========================================
// PATCH /api/notifications/read-all
// ==========================================

registerNotificationPath(
  `${base}/read-all`,
  'patch',
  'markAllNotificationsAsRead',
  'Mark all notifications as read',
  undefined,
  notificationSuccessResponseSchema,
  'Marks all unread notifications belonging to the authenticated user as read.',
);

// ==========================================
// PATCH /api/notifications/{notificationId}/read
// ==========================================

registerNotificationPath(
  `${base}/{notificationId}/read`,
  'patch',
  'markNotificationAsRead',
  'Mark notification as read',
  {
    params: notificationIdParamsSchema,
  },
  notificationSuccessResponseSchema,
  'Marks a specific notification belonging to the authenticated user as read. Returns 404 when the notification does not exist or does not belong to the authenticated user.',
);
