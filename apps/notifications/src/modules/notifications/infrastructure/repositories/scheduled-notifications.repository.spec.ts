import {
  ReplacePaymentNotificationsCommand,
  ReplacePaymentNotificationsUseCase,
} from '../../application/use-cases/replace-payment-notifications.usecase.js';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';
import { Redis } from 'ioredis';
import type { NotificationModel } from '../../../../database/models/notification.model.js';
import { isUUID, validateSync } from 'class-validator';
import { MarkNotificationsAsReadDto } from '../../../../../../main/src/modules/notifications/api/dto/mark-notifications-as-read.dto.js';
import {
  MarkNotificationsAsReadCommand,
  MarkNotificationsAsReadUseCase,
} from '../../application/use-cases/mark-notifications-as-read.usecase.js';
import { ScheduledNotificationsRepository } from './scheduled-notifications.repository.js';
import { ScheduledNotificationFactory } from '../../application/factories/scheduled-notification.factory.js';
import { PaymentNotificationFactory } from '../../../../../../payments/src/modules/payments/application/factories/payment-notification.factory.js';
import { NotificationType } from '@libs/contracts';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsScheduler } from '../../application/notifications.scheduler.js';

// Only the disposable local test container; never load application env or use a working DB.
const describeRedis =
  process.env.RUN_NOTIFICATION_REDIS_TESTS === '1' ? describe : describe.skip;

describeRedis('Scheduled notifications in isolated Redis', () => {
  let redis: Redis;
  let repository: ScheduledNotificationsRepository;
  let notifications: NotificationsRepository;
  const findByIds = async (userId: string, ids: string[]) =>
    (await notifications.findByIds(userId, ids)).map(
      (record) => record.notification,
    );
  const schedule = (notification: ScheduledNotificationModel) =>
    new ReplacePaymentNotificationsUseCase(repository).execute(
      new ReplacePaymentNotificationsCommand(notification),
    );
  const now = Date.parse('2026-11-11T10:00:00Z');
  const input = {
    userId: '42',
    paymentId: 'old-payment',
    subscriptionId: 'subscription',
    paidAt: new Date(now - 8 * 86_400_000),
    expirationDate: new Date(now + 86_400_000),
    nextChargeDate: new Date(now + 86_400_000),
  };
  const records = (overrides = {}) =>
    PaymentNotificationFactory.create({ ...input, ...overrides }).map((event) =>
      ScheduledNotificationFactory.create(event),
    );
  const read = async (id: string) =>
    JSON.parse((await redis.get(id)) ?? 'null') as Record<
      string,
      unknown
    > | null;

  beforeAll(async () => {
    redis = new Redis({
      host: '127.0.0.1',
      port: 16389,
      db: 15,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    repository = new ScheduledNotificationsRepository(redis);
    notifications = new NotificationsRepository(redis);
  });
  beforeEach(async () => {
    await redis.flushdb();
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await redis?.quit();
  });

  it('creates four distinct public UUIDs accepted by HTTP read validation', async () => {
    const items = records();
    for (const item of items) await schedule(item);
    const visible: NotificationModel[] = [];
    for (const item of items) {
      const notification = (await repository.findById(item.id))!;
      expect(isUUID(notification.id, '4')).toBe(true);
      expect(notification.id).not.toBe(item.id);
      expect(notification.userId).toBe('42');
      visible.push(notification);
    }
    const ids = visible.map((notification) => notification.id);
    expect(new Set(ids).size).toBe(4);
    const dto = Object.assign(new MarkNotificationsAsReadDto(), { ids });
    expect(validateSync(dto)).toEqual([]);
    const markRead = new MarkNotificationsAsReadUseCase(notifications);
    await markRead.execute(
      new MarkNotificationsAsReadCommand({ userId: '42', ids }),
    );
    expect(await notifications.countByUserId('42')).toBe(0);
    expect((await notifications.findReadIds('42', 10)).sort()).toEqual(
      ids.sort(),
    );
    expect((await findByIds('42', ids)).every((item) => item.isRead)).toBe(
      true,
    );
  });

  it('stores repeated events as separate notifications', async () => {
    const first = records()[0];
    const duplicate = records()[0];
    await schedule(first);
    await schedule(duplicate);
    expect(await redis.zrange('user:42:notifications', 0, -1)).toEqual(
      expect.arrayContaining([first.id, duplicate.id]),
    );
    await repository.findById(first.id);
    await repository.findById(duplicate.id);
    expect(await notifications.countByUserId('42')).toBe(2);
  });

  it('stores only applicable reminders and uses composite keys for due lookup', async () => {
    const items = records({ nextChargeDate: null });
    for (const item of items) await schedule(item);
    expect(await redis.zcard('user:42:notifications')).toBe(3);
    expect(await repository.findDueIds(now)).toEqual(
      expect.arrayContaining(items.map((item) => item.id)),
    );
    for (const item of items) {
      expect(item.id).toBe(
        `${item.executeAt}:42:old-payment:${item.notificationId}`,
      );
      expect(await redis.exists(item.id)).toBe(1);
    }
  });

  it('selects a notification only when its deadline is reached', async () => {
    const item = records({ paidAt: new Date(now) })[0];
    await schedule(item);
    expect(await repository.findDueIds(now + 29_999)).toEqual([]);
    expect(await repository.findDueIds(now + 30_000)).toEqual([item.id]);
    expect(await repository.findById(item.id)).not.toBeNull();
  });

  it('stores three one-day reminders without collisions and selects both immediate reminders', async () => {
    const items = records({
      paidAt: new Date(now),
      expirationDate: new Date(now + 86_400_000),
      nextChargeDate: new Date(now + 86_400_000),
    });
    for (const item of items) await schedule(item);
    expect(items).toHaveLength(3);
    expect(await redis.zcard('user:42:notifications')).toBe(3);
    expect(await repository.findDueIds(now - 1)).toEqual([]);
    expect((await repository.findDueIds(now)).sort()).toEqual(
      [items[2].id, items[1].id].sort(),
    );
    for (const item of items) {
      expect(await repository.findById(item.id)).toMatchObject({
        id: item.notificationId,
        title: item.title,
      });
    }
    expect(await notifications.countByUserId('42')).toBe(2);
    jest.spyOn(Date, 'now').mockReturnValue(now + 30_000);
    expect(await notifications.countByUserId('42')).toBe(3);
  });

  it('keeps different reminders with the same deadline under different UUID keys', async () => {
    const items = records();
    const charge = items[1];
    const expiration = items[2];
    expect(charge.executeAt).toBe(expiration.executeAt);
    await schedule(charge);
    await schedule(expiration);
    expect(charge.id).not.toBe(expiration.id);
    expect(await repository.findDueIds(now)).toEqual(
      expect.arrayContaining([charge.id, expiration.id]),
    );
    expect(await repository.findById(charge.id)).toMatchObject({
      title: charge.title,
    });
    expect(await repository.findById(expiration.id)).toMatchObject({
      title: expiration.title,
    });
  });

  it('removes a processed notification from the queue and keeps its history', async () => {
    const item = records()[0];
    await schedule(item);
    await repository.findById(item.id);
    await repository.removeFromQueue(item.id);
    expect(await repository.findDueIds(now)).toEqual([]);
    expect(await read(item.id)).not.toHaveProperty('executedAt');
    expect(await redis.zcard('user:42:notifications')).toBe(1);
  });

  it('does not block notifications saved after cancellation', async () => {
    await repository.deleteFutureByPaymentId('42', 'old-payment');
    const item = records()[1];
    await schedule(item);
    expect(await read(item.id)).not.toBeNull();
    expect(await repository.findDueIds(now)).toContain(item.id);
    expect(
      await redis.exists('notifications:schedule:canceled:subscription'),
    ).toBe(0);
  });

  it('deletes only future notifications of the requested payment', async () => {
    const items = records({
      paidAt: new Date(now - 60_000),
      expirationDate: new Date(now + 7 * 86_400_000),
      nextChargeDate: new Date(now + 7 * 86_400_000),
    });
    const other = records({ userId: '43', paymentId: 'other-payment' });
    for (const item of [...items, ...other]) await schedule(item);
    await repository.deleteFutureByPaymentId('42', 'unrelated-payment');
    expect(await redis.exists(items[1].id)).toBe(1);
    await repository.deleteFutureByPaymentId('42', 'old-payment');
    await repository.deleteFutureByPaymentId('42', 'old-payment');
    for (const item of items) {
      expect(await redis.exists(item.id)).toBe(item.executeAt > now ? 0 : 1);
    }
    expect(await redis.zrange('user:42:notifications', 0, -1)).toEqual(
      expect.arrayContaining([items[0].id, items[3].id]),
    );
    expect(await redis.zcard('user:42:notifications')).toBe(2);
    for (const item of [items[1], items[2]]) {
      expect(
        await redis.zscore('notifications:schedule:due', item.id),
      ).toBeNull();
    }
    for (const item of other) expect(await redis.exists(item.id)).toBe(1);
  });

  it('replaces only future seven-day reminders after one minute with a thirty-day schedule', async () => {
    const old = records({
      paidAt: new Date(now - 60_000),
      expirationDate: new Date(now - 60_000 + 7 * 86_400_000),
      nextChargeDate: new Date(now - 60_000 + 7 * 86_400_000),
    });
    for (const item of old) await schedule(item);
    const readItem = (await repository.findById(old[0].id))!;
    await repository.removeFromQueue(old[0].id);
    await notifications.save(old[0].id, {
      ...readItem,
      isRead: true,
      readAt: new Date(now).toISOString(),
    });
    const unreadItem = (await repository.findById(old[3].id))!;
    await repository.removeFromQueue(old[3].id);
    const other = records({
      userId: '43',
      paymentId: 'other-payment',
      subscriptionId: 'other-subscription',
    });
    for (const item of other) await schedule(item);
    const next = records({
      paymentId: 'new-payment',
      subscriptionId: 'new-subscription',
      paidAt: new Date(now),
      expirationDate: new Date(now + 30 * 86_400_000),
      nextChargeDate: new Date(now + 30 * 86_400_000),
    });
    for (const item of [next[3], next[1], next[0], next[2]])
      await schedule(item);
    await repository.deleteFutureByPaymentId('42', 'old-payment');
    expect((await redis.zrange('user:42:notifications', 0, -1)).sort()).toEqual(
      [...next, old[0], old[3]].map((item) => item.id).sort(),
    );
    expect(await redis.exists(old[1].id)).toBe(0);
    expect(await redis.exists(old[2].id)).toBe(0);
    expect(await notifications.findReadIds('42', 10)).toEqual([readItem.id]);
    expect(await notifications.findUnreadIds('42', 10)).toEqual([
      unreadItem.id,
    ]);
    expect(await findByIds('42', [readItem.id])).toEqual([
      { ...readItem, isRead: true, readAt: new Date(now).toISOString() },
    ]);
    expect(await findByIds('42', [unreadItem.id])).toEqual([unreadItem]);
    expect(
      await redis.zscore('notifications:schedule:due', old[1].id),
    ).toBeNull();
    expect(
      await redis.zscore('notifications:schedule:due', old[2].id),
    ).toBeNull();
    expect(await redis.zcard('user:43:notifications')).toBe(4);
    expect(await read(next[1].id)).not.toBeNull();
  });

  it('preserves read, unread and manual notifications on a new payment', async () => {
    const old = records();
    for (const item of old) await schedule(item);
    const readItem = (await repository.findById(old[0].id))!;
    await notifications.save(old[0].id, {
      ...readItem,
      isRead: true,
      readAt: new Date(now).toISOString(),
    });
    const unreadItem = (await repository.findById(old[1].id))!;
    await notifications.create({ ...readItem, id: 'manual', isRead: false });
    const next = records({
      paymentId: 'new',
      subscriptionId: 'new-subscription',
      paidAt: new Date(now),
      expirationDate: new Date(now + 30 * 86_400_000),
      nextChargeDate: new Date(now + 30 * 86_400_000),
    });
    for (const item of next) await schedule(item);
    expect(
      await findByIds(
        '42',
        old.map((item) => item.notificationId),
      ),
    ).toEqual(
      expect.arrayContaining([
        { ...readItem, isRead: true, readAt: new Date(now).toISOString() },
        unreadItem,
        expect.objectContaining({ id: old[2].notificationId }),
        expect.objectContaining({ id: old[3].notificationId }),
      ]),
    );
    expect(await notifications.findReadIds('42', 10)).toEqual([readItem.id]);
    expect((await notifications.findUnreadIds('42', 10)).sort()).toEqual(
      [
        'manual',
        unreadItem.id,
        old[2].notificationId,
        old[3].notificationId,
      ].sort(),
    );
    expect(await notifications.countByUserId('42')).toBe(4);
    expect(await redis.zcard('user:42:notifications')).toBe(9);
  });

  it('keeps overdue and exactly due schedules even if execution has not started', async () => {
    const old = records();
    for (const item of old) await schedule(item);
    await schedule(records({ paymentId: 'new', paidAt: new Date(now) })[0]);
    expect(await repository.findDueIds(now)).toEqual(
      expect.arrayContaining(old.map((item) => item.id)),
    );
    expect(await repository.findById(old[1].id)).toMatchObject({
      id: old[1].notificationId,
    });
  });

  it('cancellation of another payment preserves the notification', async () => {
    const item = records()[1];
    await schedule(item);
    await repository.deleteFutureByPaymentId('42', 'previous-payment');
    expect(await read(item.id)).not.toBeNull();
    expect(await repository.findById(item.id)).toMatchObject({
      id: item.notificationId,
    });
  });

  it('removes failed notifications from the queue without storing error state', async () => {
    const item = records()[0];
    await schedule(item);
    await repository.findById(item.id);
    await repository.removeFromQueue(item.id);
    expect(await repository.findDueIds(now + 10_000)).toEqual([]);
    expect(await repository.findDueIds(now + 86_400_000)).toEqual([]);
    expect(await read(item.id)).not.toHaveProperty('attempts');
    expect(await read(item.id)).not.toHaveProperty('lastError');
    expect(await redis.exists(`notification:${item.notificationId}`)).toBe(0);
    expect(await redis.exists(item.id)).toBe(1);
  });

  it('shows only the activation notification for an offline five-minute subscription', async () => {
    const items = records({
      paidAt: new Date(now),
      expirationDate: new Date(now + 5 * 60_000),
      nextChargeDate: new Date(now + 5 * 60_000),
    });
    for (const item of items) await schedule(item);
    expect(items).toHaveLength(1);
    expect(await redis.zcard('user:42:notifications')).toBe(1);
    expect(await notifications.countByUserId('42')).toBe(0);
    const offlineDelivery = { deliver: jest.fn().mockResolvedValue(undefined) };
    const scheduler = new NotificationsScheduler(
      repository,
      offlineDelivery as unknown as ConstructorParameters<
        typeof NotificationsScheduler
      >[1],
    );
    jest.spyOn(Date, 'now').mockReturnValue(now + 30_000);
    await scheduler.execute();
    await scheduler.execute();
    expect(offlineDelivery.deliver).toHaveBeenCalledTimes(1);
    expect(await notifications.countByUserId('42')).toBe(1);
    const unread = await notifications.findUnreadIds('42', 10);
    expect(unread).toEqual([items[0].notificationId]);
    const visible = await findByIds('42', unread);
    expect(visible).toHaveLength(1);
    expect(visible[0].title).toBe(items[0].title);
    await notifications.save(items[0].id, {
      ...visible[0],
      isRead: true,
      readAt: new Date(now + 30_000).toISOString(),
    });
    expect(await notifications.countByUserId('42')).toBe(0);
    expect(await notifications.findReadIds('42', 10)).toEqual([
      items[0].notificationId,
    ]);
  });

  it('keeps a created reminder visible after cancellation but prevents further execution', async () => {
    const items = records();
    for (const item of items) await schedule(item);
    await repository.findById(items[0].id);
    await repository.findById(items[1].id);
    await repository.removeFromQueue(items[0].id);
    await repository.removeFromQueue(items[1].id);
    expect(await notifications.countByUserId('42')).toBe(4);
    await repository.deleteFutureByPaymentId('42', 'old-payment');
    expect(await redis.zcard('user:42:notifications')).toBe(4);
    expect(await read(items[1].id)).not.toHaveProperty('executedAt');
    expect(await repository.findDueIds(now)).not.toContain(items[1].id);
    expect(await notifications.countByUserId('42')).toBe(4);
    expect(await notifications.findUnreadIds('42', 10)).toEqual(
      expect.arrayContaining([
        items[0].notificationId,
        items[1].notificationId,
      ]),
    );
    expect(
      (
        await findByIds(
          '42',
          items.map((item) => item.notificationId),
        )
      )
        .map((item) => item.id)
        .sort(),
    ).toEqual(items.map((item) => item.notificationId).sort());
    const reminder = (await findByIds('42', [items[1].notificationId]))[0];
    await notifications.save(items[1].id, {
      ...reminder,
      isRead: true,
      readAt: new Date(now).toISOString(),
    });
    expect(await notifications.findReadIds('42', 10)).toEqual([
      items[1].notificationId,
    ]);
    expect(await notifications.countByUserId('42')).toBe(3);
  });

  it('includes created reminders in pagination and keeps direct notifications visible', async () => {
    const item = records()[0];
    await schedule(item);
    await repository.findById(item.id);
    await repository.removeFromQueue(item.id);
    const pipeline = redis.pipeline();
    for (let index = 0; index < 105; index++) {
      const id = `created-${index}`;
      pipeline.set(
        `notification:${id}`,
        JSON.stringify({ ...item, id, createdAt: new Date(now).toISOString() }),
      );
      pipeline.zadd('user:42:notifications', now, `notification:${id}`);
    }
    await pipeline.exec();
    await notifications.create({
      id: 'manual',
      userId: '42',
      type: NotificationType.PAYMENT,
      title: 'Payment failed',
      message: 'Failed',
      isRead: false,
      readAt: null,
      createdAt: new Date(now - 2_000).toISOString(),
    });
    const page = await notifications.findUnreadIds('42', 2);
    expect(page).toHaveLength(2);
    expect(page.every((id) => id.startsWith('created-'))).toBe(true);
    expect(await findByIds('42', page)).toHaveLength(2);
    expect(await findByIds('42', ['manual', 'missing'])).toEqual([
      expect.objectContaining({ id: 'manual' }),
    ]);
    expect(await notifications.countByUserId('42')).toBe(107);
  });
});
