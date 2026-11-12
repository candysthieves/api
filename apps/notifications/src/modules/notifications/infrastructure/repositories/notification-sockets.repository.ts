import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { NOTIFICATION_SOCKET_KEY_PREFIX } from '@libs/contracts';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';

const SOCKET_TTL_SECONDS = 90;

// Хранит одно активное WebSocket-соединение main для каждого пользователя.
@Injectable()
export class NotificationSocketsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public getSocketKey(userId: string): string {
    return `${NOTIFICATION_SOCKET_KEY_PREFIX}${userId}`;
  }

  // Заменяет предыдущее соединение и продлевает срок записи на 90 секунд.
  async save(userId: string, socketId: string): Promise<void> {
    const key = this.getSocketKey(userId);
    await this.redis.set(key, socketId, 'EX', SOCKET_TTL_SECONDS);
  }

  // Отключение старого сокета не должно удалять запись нового соединения.
  async remove(userId: string, socketId: string): Promise<void> {
    const key = this.getSocketKey(userId);
    if ((await this.redis.get(key)) === socketId) await this.redis.del(key);
  }

  findSocketId(userId: string): Promise<string | null> {
    return this.redis.get(this.getSocketKey(userId));
  }
}
