import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedCreate, mockedFindMany, mockedFindFirst, mockedCount, mockedUpdateMany, mockedPreferenceFindUnique, mockedPreferenceUpsert } = vi.hoisted(
  () => ({
    mockedCreate: vi.fn(),
    mockedFindMany: vi.fn(),
    mockedFindFirst: vi.fn(),
    mockedCount: vi.fn(),
    mockedUpdateMany: vi.fn(),
    mockedPreferenceFindUnique: vi.fn(),
    mockedPreferenceUpsert: vi.fn(),
  }),
);

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    notificationPreference: { findUnique: mockedPreferenceFindUnique, upsert: mockedPreferenceUpsert },
    notification: {
      create: mockedCreate,
      findMany: mockedFindMany,
      findFirst: mockedFindFirst,
      count: mockedCount,
      updateMany: mockedUpdateMany,
    },
  },
}));

const {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} = await import('../../../src/services/notifications/notification.service.js');

describe('Notification service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedCreate.mockResolvedValue({ id: 'notification-1' });
    mockedPreferenceFindUnique.mockResolvedValue(null);
    mockedPreferenceUpsert.mockResolvedValue({ pullRequest: true, review: true, issue: true, comment: true, mention: true, collaborator: true, organization: true });
    mockedFindFirst.mockResolvedValue({ id: 'notification-1' });
    mockedFindMany.mockResolvedValue([]);
    mockedCount.mockResolvedValue(3);
    mockedUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('creates a notification for the specified recipient', async () => {
    await createNotification({
      userId: 'user-1',
      actorId: 'user-2',
      type: 'ISSUE',
      title: 'New issue',
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'ISSUE',
        title: 'New issue',
        actorId: 'user-2',
      },
    });
  });

  it('lists only the authenticated user notifications', async () => {
    await getNotifications('user-1', 20);

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        take: 20,
      }),
    );
  });

  it('uses a cursor belonging to the same user', async () => {
    await getNotifications('user-1', 20, 'notification-1');

    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'user-1' },
      select: { id: true },
    });
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        skip: 1,
        cursor: { id: 'notification-1' },
      }),
    );
  });

  it('rejects a cursor that does not belong to the user', async () => {
    mockedFindFirst.mockResolvedValue(null);

    await expect(getNotifications('user-1', 20, 'foreign-cursor')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_NOTIFICATION_CURSOR',
    });

    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it.each([0, -1, 101, 1.5, Number.NaN])('rejects invalid limit: %s', async (limit) => {
    await expect(getNotifications('user-1', limit)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_NOTIFICATION_LIMIT',
    });

    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it('returns unread notification count for the user', async () => {
    await expect(getUnreadNotificationCount('user-1')).resolves.toBe(3);

    expect(mockedCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    });
  });

  it('marks only the specified user notification as read', async () => {
    await markNotificationAsRead('user-1', 'notification-1');

    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        userId: 'user-1',
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it('marks all unread notifications belonging to the user as read', async () => {
    await markAllNotificationsAsRead('user-1');

    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('skips notification when the recipient disabled that notification type', async () => {
    mockedPreferenceFindUnique.mockResolvedValue({
      pullRequest: true,
      review: true,
      issue: false,
      comment: true,
      mention: true,
      collaborator: true,
      organization: true,
    });

    const result = await createNotification({
      userId: 'user-1',
      actorId: 'user-2',
      type: 'ISSUE',
      title: 'New issue',
    });

    expect(result).toBeNull();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('skips notifications when actor and recipient are the same user', async () => {
    const result = await createNotification({
      userId: 'user-1',
      actorId: 'user-1',
      type: 'ISSUE',
      title: 'New issue',
    });

    expect(result).toBeNull();
    expect(mockedPreferenceFindUnique).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('does not create a notification when preference lookup fails', async () => {
    mockedPreferenceFindUnique.mockRejectedValue(new Error('Database unavailable'));

    await expect(
      createNotification({
        userId: 'user-1',
        actorId: 'user-2',
        type: 'ISSUE',
        title: 'New issue',
      }),
    ).rejects.toThrow('Database unavailable');

    expect(mockedCreate).not.toHaveBeenCalled();
  });






  it('creates default notification preferences for a new user', async () => {
    await getNotificationPreferences('user-1');

    expect(mockedPreferenceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: { userId: 'user-1' },
        update: {},
      }),
    );
  });

  it('returns existing notification preferences', async () => {
    const preferences = {
      pullRequest: true,
      review: false,
      issue: true,
      comment: true,
      mention: false,
      collaborator: true,
      organization: true,
    };

    mockedPreferenceUpsert.mockResolvedValue(preferences);

    await expect(getNotificationPreferences('user-1')).resolves.toEqual(preferences);
  });

  it('updates only supplied notification preferences', async () => {
    await updateNotificationPreferences('user-1', { issue: false });

    expect(mockedPreferenceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', issue: false },
        update: { issue: false },
      }),
    );
  });

  it('filters undefined values before updating preferences', async () => {
    await updateNotificationPreferences('user-1', {
      issue: false,
      review: undefined,
    });

    expect(mockedPreferenceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'user-1', issue: false },
        update: { issue: false },
      }),
    );
  });
});
