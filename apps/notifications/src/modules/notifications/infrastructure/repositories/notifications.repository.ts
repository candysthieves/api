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

  private getUserNotificationsKey(userId: string): string {
    return `user:${userId}:notifications`;
  }

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async create(notification: NotificationModel): Promise<void> {
    const notificationKey = this.getNotificationKey(notification.id);
    const userNotificationsKey = this.getUserNotificationsKey(
      notification.userId,
    );

    const score = new Date(notification.createdAt).getTime();

    await this.redis
      .multi()
      .set(notificationKey, JSON.stringify(notification))
      .zadd(userNotificationsKey, score, notification.id)
      .exec();
  }

  async countByUserId(userId: string): Promise<number> {
    const userNotificationsKey = this.getUserNotificationsKey(userId);

    const oneMonthAgoTimestamp = Date.now() - ms('30d');

    return this.redis.zcount(
      userNotificationsKey,
      oneMonthAgoTimestamp,
      '+inf',
    );
  }

  async findByIds(ids: string[]): Promise<NotificationModel[]> {
    const keys: string[] = ids.map((id) => this.getNotificationKey(id));

    const records = await this.redis.mget(...keys);

    return records
      .filter((raw) => raw !== null)
      .map((raw) => JSON.parse(raw) as NotificationModel);
  }

  async saveMany(notifications: NotificationModel[]): Promise<void> {
    if (!notifications.length) {
      return;
    }

    const pipeline = this.redis.pipeline();

    for (const notification of notifications) {
      pipeline.set(
        this.getNotificationKey(notification.id),
        JSON.stringify(notification),
      );
    }

    await pipeline.exec();
  }

  async findUserNotificationsByCursorDate(
    userId: string,
    pageSize: number,
    cursorDate?: string | null,
  ): Promise<string[]> {
    const key = this.getUserNotificationsKey(userId);
    const oneMonthAgo = Date.now() - ms('30d');

    const maxScore = cursorDate ? `(${new Date(cursorDate).getTime()}` : '+inf';

    return this.redis.zrevrangebyscore(
      key,
      maxScore,
      oneMonthAgo,
      'LIMIT',
      0,
      pageSize + 1,
    );
  }
}
