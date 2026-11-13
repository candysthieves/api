import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';
import type { NotificationModel } from '../../../../database/models/notification.model.js';

const DUE_KEY = 'notifications:schedule:due';

@Injectable()
export class ScheduledNotificationsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(preparedNotification: ScheduledNotificationModel): Promise<void> {
    const userKey = `user:${preparedNotification.userId}:notifications`;
    // Запись (String/JSON): например, "1800000000000:42:payment-123:notification-456".
    // Формат ключа: executeAt:userId:paymentId:notificationId; JSON сразу содержит публичные поля.
    await this.redis.set(
      preparedNotification.id,
      JSON.stringify({
        ...preparedNotification,
        id: preparedNotification.notificationId,
      }),
    );
    // Общий индекс (Sorted Set): "user:42:notifications" — ключ записи со score executeAt.
    await this.redis.zadd(
      userKey,
      preparedNotification.executeAt,
      preparedNotification.id,
    );
    // Очередь выполнения (Sorted Set): "notifications:schedule:due".
    // Элемент — ключ записи, score — executeAt в миллисекундах.
    await this.redis.zadd(
      DUE_KEY,
      preparedNotification.executeAt,
      preparedNotification.id,
    );
  }

  async deleteFutureByPaymentId(
    userId: string,
    paymentId: string,
  ): Promise<void> {
    const userKey = `user:${userId}:notifications`;
    // Общий индекс (Sorted Set): "user:42:notifications" — читаем ключи будущих записей.
    const ids = await this.redis.zrangebyscore(
      userKey,
      `(${Date.now()}`,
      '+inf',
    );
    const now = Date.now();
    for (const id of ids) {
      const [executeAt, , scheduledPaymentId] = id.split(':');
      if (scheduledPaymentId !== paymentId || Number(executeAt) <= now)
        continue;
      await this.deleteNotification(id, userId);
    }
  }

  async findFutureByUserId(
    userId: string,
    now: number,
  ): Promise<{ key: string; paymentId: string }[]> {
    // Общий индекс (Sorted Set): "user:42:notifications" — ключи со сроком строго после now.
    const keys = await this.redis.zrangebyscore(
      `user:${userId}:notifications`,
      `(${now}`,
      '+inf',
    );
    return keys.map((key) => ({ key, paymentId: key.split(':')[2] }));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const userKey = `user:${userId}:notifications`;
    // Запись (String/JSON): "1800000000000:42:payment-123:notification-456" — удаляем сам объект.
    await this.redis.del(id);
    // Очередь выполнения (Sorted Set): "notifications:schedule:due" — убираем ключ записи.
    await this.redis.zrem(DUE_KEY, id);
    // Общий индекс (Sorted Set): "user:42:notifications" — убираем ключ записи.
    await this.redis.zrem(userKey, id);
  }

  // Возвращает из очереди до 10 ID уведомлений, время выполнения которых уже наступило (score <= now).
  // Только читает ID: выполнение и удаление из очереди происходят отдельно.
  findDueIds(now: number): Promise<string[]> {
    // Очередь выполнения (Sorted Set): "notifications:schedule:due" — первые 10 ключей со score <= now.
    return this.redis.zrangebyscore(DUE_KEY, '-inf', now, 'LIMIT', 0, 10);
  }

  async removeFromQueue(id: string): Promise<void> {
    // Очередь выполнения (Sorted Set): "notifications:schedule:due" — убираем ключ; сама запись остаётся.
    await this.redis.zrem(DUE_KEY, id);
  }

  async findById(id: string): Promise<NotificationModel | null> {
    // Запись (String/JSON): "1800000000000:42:payment-123:notification-456" — читаем запланированное уведомление.
    const raw = await this.redis.get(id);
    return raw ? (JSON.parse(raw) as NotificationModel) : null;
  }
}
