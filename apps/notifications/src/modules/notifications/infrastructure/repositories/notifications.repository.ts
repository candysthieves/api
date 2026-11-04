import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import { Redis } from 'ioredis';
import { NotificationModel } from '../../../../database/models/notification.model.js';
import ms from 'ms';

@Injectable()
export class NotificationsRepository {
  private getNotificationKey(id: string): string {
    return `notification:${id}`;
  }

  private getUserUnreadNotificationsKey(userId: string): string {
    return `user:${userId}:notifications:unread`;
  }

  private getUserReadNotificationsKey(userId: string): string {
    return `user:${userId}:notifications:read`;
  }

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async create(notification: NotificationModel): Promise<void> {
    const notificationKey = this.getNotificationKey(notification.id);
    const unreadKey = this.getUserUnreadNotificationsKey(notification.userId);

    const score = new Date(notification.createdAt).getTime();

    await this.redis
      .multi()
      .set(notificationKey, JSON.stringify(notification))
      .zadd(unreadKey, score, notification.id)
      .exec();
  }

  async countByUserId(userId: string): Promise<number> {
    const unreadKey = this.getUserUnreadNotificationsKey(userId);
    const oneMonthAgoTimestamp = Date.now() - ms('30d');

    return this.redis.zcount(unreadKey, oneMonthAgoTimestamp, '+inf');
  }

  async findByIds(ids: string[]): Promise<NotificationModel[]> {
    if (!ids.length) {
      return [];
    }

    const keys: string[] = ids.map((id) => this.getNotificationKey(id));
    const records = await this.redis.mget(...keys);

    return records
      .filter((raw): raw is string => raw !== null)
      .map((raw) => JSON.parse(raw) as NotificationModel);
  }

  async saveManyAndMoveToRead(
    userId: string,
    notifications: NotificationModel[],
  ): Promise<void> {
    if (!notifications.length) {
      return;
    }

    const unreadKey = this.getUserUnreadNotificationsKey(userId);
    const readKey = this.getUserReadNotificationsKey(userId);

    const pipeline = this.redis.pipeline();

    for (const notification of notifications) {
      const score = new Date(notification.createdAt).getTime();
      pipeline.set(
        this.getNotificationKey(notification.id),
        JSON.stringify(notification),
      );
      pipeline.zrem(unreadKey, notification.id);
      pipeline.zadd(readKey, score, notification.id);
    }

    await pipeline.exec();
  }

  private async findBySet(
    setKey: string,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    const oneMonthAgo = Date.now() - ms('30d');
    const maxScore = cursorDate ? `(${new Date(cursorDate).getTime()}` : '+inf';

    return this.redis.zrevrangebyscore(
      setKey,
      maxScore,
      oneMonthAgo,
      'LIMIT',
      0,
      limit,
    );
  }

  async findUnreadIds(
    userId: string,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    return this.findBySet(
      this.getUserUnreadNotificationsKey(userId),
      limit,
      cursorDate,
    );
  }

  async findReadIds(
    userId: string,
    limit: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    return this.findBySet(
      this.getUserReadNotificationsKey(userId),
      limit,
      cursorDate,
    );
  }
}
