import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'PULL_REQUEST',
  'REVIEW',
  'ISSUE',
  'COMMENT',
  'MENTION',
  'COLLABORATOR',
  'ORGANIZATION',
]).openapi('NotificationType');

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  actorId: z.string().nullable(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string().nullable(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
}).openapi('Notification');

export const notificationPreferencesSchema = z.object({
  pullRequest: z.boolean(),
  review: z.boolean(),
  issue: z.boolean(),
  comment: z.boolean(),
  mention: z.boolean(),
  collaborator: z.boolean(),
  organization: z.boolean(),
}).openapi('NotificationPreferences');

export const updateNotificationPreferencesRequestSchema = z.strictObject({
  pullRequest: z.boolean().optional(),
  review: z.boolean().optional(),
  issue: z.boolean().optional(),
  comment: z.boolean().optional(),
  mention: z.boolean().optional(),
  collaborator: z.boolean().optional(),
  organization: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one preference must be provided',
}).openapi('UpdateNotificationPreferencesRequest');

export const listNotificationsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).openapi({
    description: 'Maximum number of notifications to return.',
    example: 20,
  }),
  cursor: z.string().trim().min(1).max(128).optional().openapi({
    description: 'Notification ID used as the pagination cursor.',
    example: 'clx123notification',
  }),
}).openapi('ListNotificationsQuery');

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().trim().min(1).max(128).openapi({
    description: 'Notification ID.',
    example: 'clx123notification',
  }),
});

export const notificationListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    notifications: z.array(notificationSchema),
  }),
}).openapi('NotificationListResponse');

export const notificationUnreadCountResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    count: z.number().int().nonnegative(),
  }),
}).openapi('NotificationUnreadCountResponse');

export const notificationPreferencesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    preferences: notificationPreferencesSchema,
  }),
}).openapi('NotificationPreferencesResponse');

export const notificationSuccessResponseSchema = z.object({
  success: z.literal(true),
}).openapi('NotificationSuccessResponse');

export const notificationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
}).openapi('NotificationError');
