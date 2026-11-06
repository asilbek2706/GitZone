import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';

export const createNotification = async (input: {
  userId: string;
  actorId?: string;
  type:
    | 'PULL_REQUEST'
    | 'REVIEW'
    | 'ISSUE'
    | 'COMMENT'
    | 'MENTION'
    | 'COLLABORATOR'
    | 'ORGANIZATION';
  title: string;
  message?: string;
  resourceType?: string;
  resourceId?: string;
}) => {
  if (input.actorId === input.userId) return null;

  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: input.userId },
    select: {
      pullRequest: true,
      review: true,
      issue: true,
      comment: true,
      mention: true,
      collaborator: true,
      organization: true,
    },
  });

  const preferenceKey = {
    PULL_REQUEST: 'pullRequest',
    REVIEW: 'review',
    ISSUE: 'issue',
    COMMENT: 'comment',
    MENTION: 'mention',
    COLLABORATOR: 'collaborator',
    ORGANIZATION: 'organization',
  } as const;

  if (preference && !preference[preferenceKey[input.type]]) return null;

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      ...(input.actorId !== undefined && { actorId: input.actorId }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.resourceType !== undefined && { resourceType: input.resourceType }),
      ...(input.resourceId !== undefined && { resourceId: input.resourceId }),
    },
  });
};
export const getNotifications = async (userId: string, limit: number, cursor?: string) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('Invalid notification limit', 400, 'INVALID_NOTIFICATION_LIMIT');
  }

  if (cursor) {
    const cursorNotification = await prisma.notification.findFirst({
      where: { id: cursor, userId },
      select: { id: true },
    });

    if (!cursorNotification) {
      throw new AppError('Invalid notification cursor', 400, 'INVALID_NOTIFICATION_CURSOR');
    }
  }

  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
  });
};

export const getUnreadNotificationCount = async (userId: string) => {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

export const getNotificationPreferences = async (userId: string) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      pullRequest: true,
      review: true,
      issue: true,
      comment: true,
      mention: true,
      collaborator: true,
      organization: true,
    },
  });
};

export const updateNotificationPreferences = async (
  userId: string,
  preferences: {
    pullRequest?: boolean | undefined;
    review?: boolean | undefined;
    issue?: boolean | undefined;
    comment?: boolean | undefined;
    mention?: boolean | undefined;
    collaborator?: boolean | undefined;
    organization?: boolean | undefined;
  },
) => {
  const cleanPreferences = Object.fromEntries(
    Object.entries(preferences).filter(([, value]) => value !== undefined),
  );

  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...cleanPreferences },
    update: cleanPreferences,
    select: {
      pullRequest: true,
      review: true,
      issue: true,
      comment: true,
      mention: true,
      collaborator: true,
      organization: true,
    },
  });
};
