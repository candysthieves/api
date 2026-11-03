import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import { Redis } from 'ioredis';
import { NotificationModel } from '../../../../database/models/notification.model.js';
import ms from 'ms';

@Injectable()
export class NotificationsRepository {
  private getNotificationsKey(id: string): string {
    return `notifications:user:${id}`;
  }

  private getUserNotificationsKey(userId: string): string {
    return `user:${userId}:notifications`;
  }

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async create(notification: NotificationModel): Promise<void> {
    const notificationKey = this.getNotificationsKey(notification.id);
    const userNotificationsKey = this.getUserNotificationsKey(
      notification.userId,
    );

    await this.redis
      .multi()
      .set(notificationKey, JSON.stringify(notification))
      .zadd(userNotificationsKey, notification.createdAt, notification.id)
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
}
