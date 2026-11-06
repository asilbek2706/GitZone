import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().min(1).max(128).optional(),
});

export const notificationIdSchema = z.string().trim().min(1).max(128);

export const updateNotificationPreferencesSchema = z.strictObject({
  pullRequest: z.boolean().optional(),
  review: z.boolean().optional(),
  issue: z.boolean().optional(),
  comment: z.boolean().optional(),
  mention: z.boolean().optional(),
  collaborator: z.boolean().optional(),
  organization: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one preference must be provided',
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
