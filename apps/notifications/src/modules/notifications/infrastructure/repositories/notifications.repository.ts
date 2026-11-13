import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import { Redis } from 'ioredis';
import { NotificationModel } from '../../../../database/models/notification.model.js';
import ms from 'ms';

type NotificationRecord = { key: string; notification: NotificationModel };

@Injectable()
export class NotificationsRepository {
  private getNotificationKey(id: string): string {
    return `notification:${id}`;
  }

  private getUserNotificationsKey(userId: string): string {
    return `user:${userId}:notifications`;
  }

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async create(notification: NotificationModel): Promise<void> {
    const notificationKey = this.getNotificationKey(notification.id);
    const userKey = this.getUserNotificationsKey(notification.userId);

    const timeToExecute = new Date(notification.createdAt).getTime();

    await this.redis
      .multi()
      .set(notificationKey, JSON.stringify(notification))
      .zadd(userKey, timeToExecute, notificationKey)
      .exec();
  }

  async countByUserId(userId: string): Promise<number> {
    const notifications = await this.findByUserId(userId);
    return notifications.filter((notification) => !notification.isRead).length;
  }

  async findByUserId(userId: string): Promise<NotificationModel[]> {
    // Общий индекс (Sorted Set): "user:42:notifications", score — дата создания.
    const keys = await this.redis.zrevrangebyscore(
      this.getUserNotificationsKey(userId),
      Date.now(),
      Date.now() - ms('30d'),
    );
    const records = await this.findByKeys(keys);
    return records.map((record) => record.notification);
  }

  async findByIds(
    userId: string,
    ids: string[],
  ): Promise<NotificationRecord[]> {
    if (!ids.length) return [];
    const now = Date.now();
    const keys = await this.redis.zrevrangebyscore(
      this.getUserNotificationsKey(userId),
      now,
      now - ms('30d'),
    );
    return this.findByKeys(
      keys.filter((key) => ids.includes(key.split(':').at(-1)!)),
    );
  }

  private async findByKeys(keys: string[]): Promise<NotificationRecord[]> {
    if (!keys.length) {
      return [];
    }

    const values = await this.redis.mget(...keys);
    const records: NotificationRecord[] = [];
    for (let index = 0; index < keys.length; index++) {
      const raw = values[index];
      if (raw === null) continue;
      records.push({
        key: keys[index],
        notification: JSON.parse(raw) as NotificationModel,
      });
    }
    return records;
  }

  async save(key: string, notification: NotificationModel): Promise<void> {
    // Исходный JSON: "1800000000000:42:payment-123:notification-456" или "notification:notification-456".
    // Меняем запись по найденному ключу; индекс не меняется.
    await this.redis.set(key, JSON.stringify(notification));
  }

  async findUnreadIds(
    userId: string,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    return this.findIdsByReadStatus(userId, false, limit, cursorDate);
  }

  async findReadIds(
    userId: string,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    return this.findIdsByReadStatus(userId, true, limit, cursorDate);
  }

  private async findIdsByReadStatus(
    userId: string,
    isRead: boolean,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    if (limit <= 0) return [];
    const notifications = await this.findByUserId(userId);
    const before = cursorDate ? new Date(cursorDate).getTime() : Infinity;
    return notifications
      .filter(
        (notification) =>
          notification.isRead === isRead &&
          new Date(notification.createdAt).getTime() < before,
      )
      .slice(0, limit)
      .map((notification) => notification.id);
  }
}
