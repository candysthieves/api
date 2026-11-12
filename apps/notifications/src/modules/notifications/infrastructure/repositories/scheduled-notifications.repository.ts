import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { NotificationTitle } from '@libs/contracts';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';
import type { NotificationModel } from '../../../../database/models/notification.model.js';

const SCHEDULED_PREFIX = 'notifications:scheduled:';
const DUE_KEY = 'notifications:schedule:due';

// Изменяет расписание обычными командами Redis без защиты от одновременных изменений.
@Injectable()
export class ScheduledNotificationsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(item: ScheduledNotificationModel): Promise<void> {
    const currentKey = `notifications:schedule:current:${item.userId}`;
    const userKey = `notifications:schedule:user:${item.userId}`;
    const currentRaw = await this.redis.get(currentKey);
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as {
        paymentId: string;
        paidAt: number;
      };
      if (
        current.paidAt > item.paidAt ||
        (current.paidAt === item.paidAt && current.paymentId > item.paymentId)
      ) {
        return;
      }
      if (current.paymentId !== item.paymentId) {
        for (const id of await this.redis.smembers(userKey)) {
          await this.redis.del(
            `${SCHEDULED_PREFIX}${id}`,
            `notification:${id}`,
          );
          await this.redis.zrem(DUE_KEY, id);
          await this.redis.zrem(`user:${item.userId}:notifications:unread`, id);
          await this.redis.zrem(`user:${item.userId}:notifications:read`, id);
        }
        await this.redis.del(userKey);
      }
    }

    await this.redis.set(
      currentKey,
      JSON.stringify({ paymentId: item.paymentId, paidAt: item.paidAt }),
    );
    const key = `${SCHEDULED_PREFIX}${item.id}`;
    if (await this.redis.exists(key)) return;

    const savedItem = { ...item };
    if (
      savedItem.title === NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY &&
      (await this.redis.exists(
        `notifications:schedule:canceled:${savedItem.subscriptionId}`,
      ))
    ) {
      savedItem.enabledToExecute = false;
    }
    await this.redis.set(key, JSON.stringify(savedItem));
    await this.redis.sadd(userKey, savedItem.id);
    if (savedItem.enabledToExecute && savedItem.executeAt !== null) {
      await this.redis.zadd(DUE_KEY, savedItem.executeAt, savedItem.id);
    }
  }

  async disableNextCharge(
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    await this.redis.set(
      `notifications:schedule:canceled:${subscriptionId}`,
      '1',
    );
    const ids = await this.redis.smembers(
      `notifications:schedule:user:${userId}`,
    );
    for (const id of ids) {
      const item = await this.findById(id);
      if (
        item?.subscriptionId === subscriptionId &&
        item.title === NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY
      ) {
        item.enabledToExecute = false;
        await this.redis.set(`${SCHEDULED_PREFIX}${id}`, JSON.stringify(item));
        await this.redis.zrem(DUE_KEY, id);
      }
    }
  }

  findDueIds(now: number): Promise<string[]> {
    return this.redis.zrangebyscore(DUE_KEY, '-inf', now, 'LIMIT', 0, 10);
  }

  async materialize(
    id: string,
    now: number,
  ): Promise<NotificationModel | null> {
    const item = await this.findById(id);
    if (
      !item ||
      !item.enabledToExecute ||
      item.executedAt !== null ||
      item.attempts >= 3
    ) {
      await this.redis.zrem(DUE_KEY, id);
      return null;
    }
    if (item.executeAt === null || item.executeAt > now) return null;

    const publicKey = `notification:${id}`;
    const existing = await this.redis.get(publicKey);
    if (existing) return JSON.parse(existing) as NotificationModel;

    const notification: NotificationModel = {
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      isRead: false,
      readAt: null,
      createdAt: new Date(now).toISOString(),
    };
    await this.redis.set(publicKey, JSON.stringify(notification));
    await this.redis.zadd(`user:${item.userId}:notifications:unread`, now, id);
    return notification;
  }

  async complete(id: string, now: number): Promise<void> {
    const item = await this.findById(id);
    if (item) {
      item.executedAt = now;
      item.lastError = null;
      await this.redis.set(`${SCHEDULED_PREFIX}${id}`, JSON.stringify(item));
    }
    await this.redis.zrem(DUE_KEY, id);
  }

  async fail(id: string, now: number, error: unknown): Promise<void> {
    const item = await this.findById(id);
    if (!item || !item.enabledToExecute || item.executedAt !== null) return;

    item.attempts += 1;
    item.lastError = error instanceof Error ? error.message : String(error);
    if (item.attempts >= 3) {
      await this.redis.zrem(DUE_KEY, id);
    } else {
      await this.redis.zadd(DUE_KEY, now + 10_000, id);
    }
    await this.redis.set(`${SCHEDULED_PREFIX}${id}`, JSON.stringify(item));
  }

  private async findById(
    id: string,
  ): Promise<ScheduledNotificationModel | null> {
    const raw = await this.redis.get(`${SCHEDULED_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as ScheduledNotificationModel) : null;
  }
}
