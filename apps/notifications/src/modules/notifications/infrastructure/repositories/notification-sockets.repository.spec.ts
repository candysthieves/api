import { Redis } from 'ioredis';
import { NotificationSocketsRepository } from './notification-sockets.repository.js';

// Только отдельный временный Redis для тестов, без конфигурации приложения.
const describeRedis =
  process.env.RUN_NOTIFICATION_REDIS_TESTS === '1' ? describe : describe.skip;

describeRedis('Notification sockets in isolated Redis', () => {
  let redis: Redis;
  let repository: NotificationSocketsRepository;
  const key = 'notifications:socket:42';

  beforeAll(async () => {
    redis = new Redis({
      host: '127.0.0.1',
      port: 16389,
      db: 15,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    repository = new NotificationSocketsRepository(redis);
  });
  beforeEach(async () => {
    await redis.flushdb();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await redis?.quit();
  });

  it('replaces the previous socket and renews the current socket lifetime', async () => {
    await repository.save('42', 'first');
    await repository.save('42', 'second');
    expect(await repository.findSocketId('42')).toBe('second');
    await redis.expire(key, 1);
    await repository.save('42', 'second');
    expect(await redis.get(key)).toBe('second');
    expect(await redis.ttl(key)).toBeGreaterThanOrEqual(89);
    expect(await redis.ttl(key)).toBeLessThanOrEqual(90);
  });

  it('returns no socket after the key expires', async () => {
    await repository.save('42', 'stale');
    await redis.pexpire(key, 0);
    expect(await repository.findSocketId('42')).toBeNull();
  });

  it('removes only the selected user socket and tolerates repeated removal', async () => {
    await repository.save('42', 'first');
    await repository.save('42', 'second');
    await repository.save('43', 'first');
    await repository.remove('42', 'first');
    await repository.remove('42', 'first');
    expect(await repository.findSocketId('42')).toBe('second');
    expect(await repository.findSocketId('43')).toBe('first');
    await repository.remove('42', 'second');
    await repository.remove('42', 'second');
    expect(await repository.findSocketId('42')).toBeNull();
    expect(await repository.findSocketId('43')).toBe('first');
  });
});
