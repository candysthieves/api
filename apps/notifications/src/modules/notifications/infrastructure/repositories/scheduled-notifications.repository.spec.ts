import { Redis } from 'ioredis';
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
    JSON.parse((await redis.get(`notifications:scheduled:${id}`))!) as {
      enabledToExecute: boolean;
      executedAt: number | null;
      attempts: number;
    };

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

  it('stores all four, including past dates, but excludes a disabled charge from execution', async () => {
    const items = records({ nextChargeDate: null });
    await Promise.all(items.map((item) => repository.save(item)));
    expect(await redis.scard('notifications:schedule:user:42')).toBe(4);
    expect(await repository.findDueIds(now)).toEqual(
      expect.arrayContaining([items[0].id, items[2].id, items[3].id]),
    );
    expect(await repository.findDueIds(now)).not.toContain(items[1].id);
    expect(await repository.materialize(items[1].id, now)).toBeNull();
    expect(await redis.zcard('user:42:notifications:unread')).toBe(0);
    expect(await repository.materialize(items[3].id, now)).toMatchObject({
      id: items[3].id,
      userId: '42',
      isRead: false,
      createdAt: new Date(now).toISOString(),
    });
    expect(await redis.zcard('user:42:notifications:unread')).toBe(1);
  });

  it('does not execute before the deadline and picks it up exactly at the deadline', async () => {
    const item = records({ paidAt: new Date(now) })[0];
    await repository.save(item);
    expect(await repository.findDueIds(now + 29_999)).toEqual([]);
    expect(await repository.materialize(item.id, now + 29_999)).toBeNull();
    expect(await repository.findDueIds(now + 30_000)).toEqual([item.id]);
    expect(await repository.materialize(item.id, now + 30_000)).not.toBeNull();
  });

  it('does not recreate a completed notification on sequential repeated events', async () => {
    const item = records()[0];
    for (let attempt = 0; attempt < 5; attempt++) await repository.save(item);
    await repository.materialize(item.id, now);
    await repository.complete(item.id, now);
    await repository.save(item);
    expect(await repository.findDueIds(now)).toEqual([]);
    expect(await repository.materialize(item.id, now)).toBeNull();
    expect(await read(item.id)).toMatchObject({
      enabledToExecute: true,
      executedAt: now,
    });
    expect(await redis.zcard('user:42:notifications:unread')).toBe(1);
  });

  it('cancellation before creation disables only the next charge, including late events', async () => {
    await repository.disableNextCharge('42', 'subscription');
    const items = records();
    for (const item of items) await repository.save(item);
    expect(await read(items[1].id)).toMatchObject({ enabledToExecute: false });
    expect(await repository.findDueIds(now)).not.toContain(items[1].id);
    expect(await read(items[0].id)).toMatchObject({ enabledToExecute: true });
    await repository.save(items[1]);
    expect(await read(items[1].id)).toMatchObject({ enabledToExecute: false });
  });

  it('cancellation after due selection prevents materialization without deleting the record', async () => {
    const items = records();
    for (const item of items) await repository.save(item);
    expect(await repository.findDueIds(now)).toContain(items[1].id);
    await repository.disableNextCharge('42', 'subscription');
    expect(await redis.exists(`notifications:scheduled:${items[1].id}`)).toBe(
      1,
    );
    expect(await repository.materialize(items[1].id, now)).toBeNull();
    expect(await repository.findDueIds(now)).toHaveLength(3);
  });

  it('replaces old user notifications once, ignores delayed old events and preserves other users', async () => {
    const old = records();
    for (const item of old) await repository.save(item);
    await repository.materialize(old[0].id, now);
    const other = records({
      userId: '43',
      paymentId: 'other-payment',
      subscriptionId: 'other-subscription',
    });
    for (const item of other) await repository.save(item);
    const next = records({
      paymentId: 'new-payment',
      subscriptionId: 'new-subscription',
      paidAt: new Date(now),
    });
    for (const item of [next[3], next[1], next[0], next[2]])
      await repository.save(item);
    await repository.save(old[1]);
    await repository.disableNextCharge('42', 'subscription');
    expect(
      (await redis.smembers('notifications:schedule:user:42')).sort(),
    ).toEqual(next.map((item) => item.id).sort());
    expect(await redis.exists(`notifications:scheduled:${old[1].id}`)).toBe(0);
    expect(await redis.exists(`notification:${old[0].id}`)).toBe(0);
    expect(await redis.zcard('user:42:notifications:unread')).toBe(0);
    expect(await redis.scard('notifications:schedule:user:43')).toBe(4);
    expect(await read(next[1].id)).toMatchObject({ enabledToExecute: true });
  });

  it('preserves read state during retry and stops scheduling after three failures', async () => {
    const item = records()[0];
    await repository.save(item);
    const notification = (await repository.materialize(item.id, now))!;
    await notifications.saveManyAndMoveToRead('42', [
      {
        ...notification,
        type: NotificationType.PAYMENT,
        isRead: true,
        readAt: new Date(now).toISOString(),
      },
    ]);
    await repository.fail(item.id, now, new Error('offline dependency'));
    expect(await repository.findDueIds(now + 9_999)).toEqual([]);
    expect(await repository.findDueIds(now + 10_000)).toEqual([item.id]);
    expect(await repository.materialize(item.id, now + 10_000)).toMatchObject({
      isRead: true,
    });
    expect(await redis.zcard('user:42:notifications:unread')).toBe(0);
    await repository.fail(item.id, now + 10_000, new Error('again'));
    await repository.fail(item.id, now + 20_000, new Error('again'));
    expect(await repository.findDueIds(now + 30_000)).toEqual([]);
    expect(await read(item.id)).toMatchObject({
      enabledToExecute: true,
      attempts: 3,
    });
    expect(await redis.exists(`notification:${item.id}`)).toBe(1);
    expect(await notifications.findReadIds('42', 10)).toEqual([item.id]);
  });

  it('shows only the activation notification for an offline five-minute subscription', async () => {
    const items = records({
      paidAt: new Date(now),
      expirationDate: new Date(now + 5 * 60_000),
      nextChargeDate: new Date(now + 5 * 60_000),
    });
    for (const item of items) await repository.save(item);
    expect(await redis.scard('notifications:schedule:user:42')).toBe(4);
    const saved = await Promise.all(items.map((item) => read(item.id)));
    expect(saved.map((item) => item.enabledToExecute)).toEqual([
      true,
      false,
      false,
      false,
    ]);
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
    expect(unread).toEqual([items[0].id]);
    const visible = await notifications.findByIds(unread);
    expect(visible).toHaveLength(1);
    expect(visible[0].title).toBe(items[0].title);
    await notifications.saveManyAndMoveToRead('42', [
      {
        ...visible[0],
        isRead: true,
        readAt: new Date(now + 30_000).toISOString(),
      },
    ]);
    expect(await notifications.countByUserId('42')).toBe(0);
    expect(await notifications.findReadIds('42', 10)).toEqual([items[0].id]);
  });

  it('keeps a created reminder visible after cancellation but prevents further execution', async () => {
    const items = records();
    for (const item of items) await repository.save(item);
    await repository.materialize(items[0].id, now);
    await repository.materialize(items[1].id, now);
    await repository.complete(items[0].id, now);
    await repository.complete(items[1].id, now);
    expect(await notifications.countByUserId('42')).toBe(2);
    await repository.disableNextCharge('42', 'subscription');
    expect(await redis.zcard('user:42:notifications:unread')).toBe(2);
    expect(await read(items[1].id)).toMatchObject({ enabledToExecute: false });
    expect(await repository.materialize(items[1].id, now)).toBeNull();
    expect(await repository.findDueIds(now)).not.toContain(items[1].id);
    expect(await notifications.countByUserId('42')).toBe(2);
    expect(await notifications.findUnreadIds('42', 10)).toEqual(
      expect.arrayContaining([items[0].id, items[1].id]),
    );
    expect(
      (await notifications.findByIds(items.map((item) => item.id))).map(
        (item) => item.id,
      ),
    ).toEqual([items[0].id, items[1].id]);
    const reminder = (await notifications.findByIds([items[1].id]))[0];
    await notifications.saveManyAndMoveToRead('42', [
      { ...reminder, isRead: true, readAt: new Date(now).toISOString() },
    ]);
    expect(await notifications.findReadIds('42', 10)).toEqual([items[1].id]);
    expect(await notifications.countByUserId('42')).toBe(1);
  });

  it('includes created disabled reminders in pagination and keeps direct notifications visible', async () => {
    const item = records()[0];
    await repository.save(item);
    await repository.materialize(item.id, now - 1_000);
    await repository.complete(item.id, now);
    const pipeline = redis.pipeline();
    for (let index = 0; index < 105; index++) {
      const id = `disabled-${index}`;
      pipeline.set(`notification:${id}`, JSON.stringify({ ...item, id }));
      pipeline.set(
        `notifications:scheduled:${id}`,
        JSON.stringify({ enabledToExecute: false }),
      );
      pipeline.zadd('user:42:notifications:unread', now, id);
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
    expect(page.every((id) => id.startsWith('disabled-'))).toBe(true);
    expect(await notifications.findByIds(page)).toHaveLength(2);
    expect(await notifications.findByIds(['manual', 'missing'])).toEqual([
      expect.objectContaining({ id: 'manual' }),
    ]);
    expect(await notifications.countByUserId('42')).toBe(107);
  });
});
