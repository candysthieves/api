import {
  GetNotificationsQuery,
  GetNotificationsQueryHandler,
} from './get-notifications.query-handler.js';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import { NotificationType } from '../../../../database/models/notification.model.js';

describe('GetNotificationsQueryHandler', () => {
  const notification = (id: string, day: number, isRead: boolean) => ({
    id,
    userId: '42',
    type: NotificationType.PAYMENT,
    title: 'Payment',
    message: 'Message',
    isRead,
    readAt: null,
    createdAt: `2026-11-${day}T10:00:00.000Z`,
  });
  const repository = { findByUserId: jest.fn() };
  const handler = new GetNotificationsQueryHandler(
    repository as unknown as NotificationsRepository,
  );
  beforeEach(() => {
    repository.findByUserId.mockResolvedValue([
      notification('read-new', 13, true),
      notification('unread-new', 12, false),
      notification('unread-old', 11, false),
      notification('read-old', 10, true),
    ]);
  });

  it('puts unread notifications first and paginates into the read group', async () => {
    const first = await handler.execute(
      new GetNotificationsQuery({ userId: '42', pageSize: 3 }),
    );
    expect(first.items.map((item) => item.id)).toEqual([
      'unread-new',
      'unread-old',
      'read-new',
    ]);
    expect(first.hasMore).toBe(true);
    const second = await handler.execute(
      new GetNotificationsQuery({
        userId: '42',
        pageSize: 3,
        cursor: first.nextCursor,
      }),
    );
    expect(second.items.map((item) => item.id)).toEqual(['read-old']);
    expect(second.nextCursor).toBeNull();
    expect(second.hasMore).toBe(false);
  });

  it('continues unread pages before including newer read notifications', async () => {
    const first = await handler.execute(
      new GetNotificationsQuery({ userId: '42', pageSize: 1 }),
    );
    const second = await handler.execute(
      new GetNotificationsQuery({
        userId: '42',
        pageSize: 2,
        cursor: first.nextCursor,
      }),
    );
    expect(second.items.map((item) => item.id)).toEqual([
      'unread-old',
      'read-new',
    ]);
  });

  it('returns an empty final page', async () => {
    repository.findByUserId.mockResolvedValue([]);
    expect(
      await handler.execute(new GetNotificationsQuery({ userId: '42' })),
    ).toEqual({ items: [], nextCursor: null, hasMore: false });
  });
});
