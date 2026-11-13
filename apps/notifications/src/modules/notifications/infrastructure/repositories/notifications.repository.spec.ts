import type { Redis } from 'ioredis';
import { NotificationTitle, NotificationType } from '@libs/contracts';
import { NotificationsRepository } from './notifications.repository.js';
import { ScheduledNotificationsRepository } from './scheduled-notifications.repository.js';
import { ScheduledNotificationFactory } from '../../application/factories/scheduled-notification.factory.js';
import {
  MarkNotificationsAsReadCommand,
  MarkNotificationsAsReadUseCase,
} from '../../application/use-cases/mark-notifications-as-read.usecase.js';

describe('Single notification record', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  let records: Map<string, string>;
  let indexes: Map<string, Map<string, number>>;
  let notifications: NotificationsRepository;
  let scheduled: ScheduledNotificationsRepository;

  beforeEach(() => {
    records = new Map();
    indexes = new Map();
    const range = (key: string, min: number | string, max: number | string) =>
      [...(indexes.get(key) ?? new Map<string, number>())]
        .filter(
          ([, score]) =>
            score >= (min === '-inf' ? -Infinity : Number(min)) &&
            score <= (max === '+inf' ? Infinity : Number(max)),
        )
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
    const pipeline = {
      set: (key: string, value: string) => {
        records.set(key, value);
        return pipeline;
      },
      exec: () => [],
    };

    const redis = {
      get: (key: string) => records.get(key) ?? null,
      mget: async (...keys: string[]) =>
        keys.map((key) => records.get(key) ?? null),
      set: (key: string, value: string) => records.set(key, value),
      zadd: async (key: string, score: number, id: string) => {
        if (!indexes.has(key)) indexes.set(key, new Map());
        indexes.get(key)!.set(id, score);
      },
      zrem: async (key: string, id: string) => indexes.get(key)?.delete(id),
      zrangebyscore: async (
        key: string,
        min: string | number,
        max: string | number,
      ) => {
        if (String(min).startsWith('('))
          return range(key, Number(String(min).slice(1)), max).filter(
            (id) => indexes.get(key)!.get(id)! > Number(String(min).slice(1)),
          );
        return range(key, min, max);
      },
      zrevrangebyscore: async (
        key: string,
        max: string | number,
        min: string | number,
      ) => range(key, min, max),
      pipeline: () => pipeline,
    } as unknown as Redis;
    notifications = new NotificationsRepository(redis);
    scheduled = new ScheduledNotificationsRepository(redis);
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterEach(() => jest.restoreAllMocks());

  it('saving a schedule does not remove existing notifications of another payment', async () => {
    const first = create(now + 30_000);
    await scheduled.save(first);
    const second = { ...create(now + 60_000), paymentId: 'another-payment' };
    await scheduled.save(second);
    expect(records.has(first.id)).toBe(true);
    expect(records.has(second.id)).toBe(true);
    expect(indexes.get('notifications:schedule:due')?.size).toBe(2);
  });

  it('reads only requested JSON records from the user index within the visible period', async () => {
    const item = create(now);
    const unrelated = create(now);
    await scheduled.save(item);
    await scheduled.save(unrelated);
    // Unrequested JSON must not even be parsed.
    records.set(unrelated.id, 'invalid JSON');
    records.set(
      'notification:manual',
      JSON.stringify({ id: 'manual', userId: '42' }),
    );
    indexes.get('user:42:notifications')!.set('notification:manual', now);
    indexes.get('user:42:notifications')!.set('notification:future', now + 1);
    indexes
      .get('user:42:notifications')!
      .set('notification:old', now - 30 * 86_400_000 - 1);
    records.set('notification:future', 'invalid JSON');
    records.set('notification:old', 'invalid JSON');
    expect(
      await notifications.findByIds('42', [
        item.notificationId,
        'manual',
        'future',
        'old',
        'missing',
      ]),
    ).toEqual([
      {
        key: item.id,
        notification: expect.objectContaining({ id: item.notificationId }),
      },
      {
        key: 'notification:manual',
        notification: { id: 'manual', userId: '42' },
      },
    ]);
    expect(
      await notifications.findByIds('43', [item.notificationId, 'manual']),
    ).toEqual([]);
  });

  const create = (executeAt: number) =>
    ScheduledNotificationFactory.create({
      eventId: 'event',
      consumer: 'NOTIFICATIONS',
      type: 'payment.notification.scheduled',
      data: {
        userId: '42',
        paymentId: 'payment',
        subscriptionId: 'subscription',
        paidAt: now,
        executeAt,
        type: NotificationType.PAYMENT,
        title: NotificationTitle.PAYMENT_SUCCESSFUL,
        message: 'Paid',
      },
    });

  it('keeps one JSON, hides it before its deadline and retains it after sending', async () => {
    const item = create(now + 30_000);
    await scheduled.save(item);
    expect([...records.keys()]).toEqual([item.id]);
    expect(await notifications.findByUserId('42')).toEqual([]);
    expect(await notifications.countByUserId('42')).toBe(0);
    jest.spyOn(Date, 'now').mockReturnValue(now + 30_000);
    expect(await notifications.findByUserId('42')).toEqual([
      expect.objectContaining({
        id: item.notificationId,
        isRead: false,
        paymentId: 'payment',
      }),
    ]);
    await scheduled.removeFromQueue(item.id);
    expect([...records.keys()]).toEqual([item.id]);
    expect(indexes.get('notifications:schedule:due')?.size).toBe(0);
    expect(await notifications.countByUserId('42')).toBe(1);
  });

  it('marks the original JSON by public UUID without losing payment data or updating another user', async () => {
    const item = create(now);
    await scheduled.save(item);
    const useCase = new MarkNotificationsAsReadUseCase(notifications);
    await useCase.execute(
      new MarkNotificationsAsReadCommand({
        userId: '43',
        ids: [item.notificationId],
      }),
    );
    expect(JSON.parse(records.get(item.id)!).isRead).toBe(false);
    await useCase.execute(
      new MarkNotificationsAsReadCommand({
        userId: '42',
        ids: [item.notificationId],
      }),
    );
    expect(JSON.parse(records.get(item.id)!)).toMatchObject({
      id: item.notificationId,
      isRead: true,
      paymentId: 'payment',
      executeAt: now,
    });
    expect([...records.keys()]).toEqual([item.id]);
    expect(await notifications.countByUserId('42')).toBe(0);
  });
});
