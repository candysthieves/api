import { Redis } from 'ioredis';
import { isUUID } from 'class-validator';
import { NotificationType } from '@libs/contracts';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import {
  CreateNotificationCommand,
  CreateNotificationUseCase,
} from './create-notification.usecase.js';
import {
  MarkNotificationsAsReadCommand,
  MarkNotificationsAsReadUseCase,
} from './mark-notifications-as-read.usecase.js';

// This suite clears only DB 15 of the disposable test Redis, never application Redis.
const describeRedis =
  process.env.RUN_NOTIFICATION_REDIS_TESTS === '1' ? describe : describe.skip;

describeRedis('Notification lifecycle in isolated Redis', () => {
  let redis: Redis;
  let repository: NotificationsRepository;
  let create: CreateNotificationUseCase;
  let markRead: MarkNotificationsAsReadUseCase;
  const findByIds = async (userId: string, ids: string[]) =>
    (await repository.findByIds(userId, ids)).map(
      (record) => record.notification,
    );
  const dto = {
    userId: '42',
    type: NotificationType.PAYMENT,
    title: 'Payment failed',
    message: 'Please try again.',
  };
  const createFor = async (userId: string) => {
    await create.execute(new CreateNotificationCommand({ ...dto, userId }));
    const ids = await repository.findUnreadIds(userId, 10);
    return (await findByIds(userId, ids))[0];
  };
  beforeAll(async () => {
    redis = new Redis({
      host: '127.0.0.1',
      port: 16389,
      db: 15,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    repository = new NotificationsRepository(redis);
    create = new CreateNotificationUseCase(repository);
    markRead = new MarkNotificationsAsReadUseCase(repository);
  });
  beforeEach(async () => {
    await redis.flushdb();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await redis?.quit();
  });

  it('creates an unread notification with a UUID and exposes it only to its owner', async () => {
    const before = Date.now();
    const item = await createFor('42');
    expect(item).toMatchObject({ ...dto, isRead: false, readAt: null });
    expect(isUUID(item.id, '4')).toBe(true);
    expect(Date.parse(item.createdAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(item.createdAt)).toBeLessThanOrEqual(Date.now());
    expect(await repository.countByUserId('42')).toBe(1);
    expect(await repository.countByUserId('43')).toBe(0);
    expect(await repository.findUnreadIds('43', 10)).toEqual([]);
  });

  it('keeps distinct notifications even when their content is identical', async () => {
    await createFor('42');
    await createFor('42');
    const ids = await repository.findUnreadIds('42', 10);
    expect(new Set(ids).size).toBe(2);
    expect(await findByIds('42', ids)).toHaveLength(2);
    expect(await repository.countByUserId('42')).toBe(2);
  });

  it('marks only owned notifications and ignores foreign and missing IDs', async () => {
    const own = await createFor('42');
    const foreign = await createFor('43');
    await markRead.execute(
      new MarkNotificationsAsReadCommand({
        userId: '42',
        ids: [own.id, foreign.id, 'missing'],
      }),
    );
    expect(await repository.findUnreadIds('42', 10)).toEqual([]);
    expect(await repository.findReadIds('42', 10)).toEqual([own.id]);
    expect(await repository.countByUserId('42')).toBe(0);
    expect(await repository.countByUserId('43')).toBe(1);
    expect((await findByIds('43', [foreign.id]))[0]).toEqual(foreign);
    const updated = (await findByIds('42', [own.id]))[0];
    expect(updated).toEqual({
      ...own,
      isRead: true,
      readAt: updated.readAt,
    });
    expect(typeof updated.readAt).toBe('string');
    expect(Number.isFinite(Date.parse(updated.readAt!))).toBe(true);
  });

  it('preserves readAt on repeated marking and tolerates duplicate IDs', async () => {
    const own = await createFor('42');
    const command = new MarkNotificationsAsReadCommand({
      userId: '42',
      ids: [own.id, own.id],
    });
    await markRead.execute(command);
    const first = await findByIds('42', [own.id]);
    await markRead.execute(command);
    expect(await findByIds('42', [own.id])).toEqual(first);
    expect(await repository.findReadIds('42', 10)).toEqual([own.id]);
    expect(await repository.countByUserId('42')).toBe(0);
  });

  it('excludes notifications older than 30 days from unread count and lists', async () => {
    const item = await createFor('42');
    const timestamp = Date.parse(item.createdAt);
    jest.spyOn(Date, 'now').mockReturnValue(timestamp + 30 * 86_400_000);
    expect(await repository.countByUserId('42')).toBe(1);
    jest.spyOn(Date, 'now').mockReturnValue(timestamp + 30 * 86_400_000 + 1);
    expect(await repository.countByUserId('42')).toBe(0);
    expect(await repository.findUnreadIds('42', 10)).toEqual([]);
  });
});
