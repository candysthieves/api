import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../../database/database.constants.js';
import { Redis } from 'ioredis';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async test() {
    await this.redis.set('key', 'value');
    const val = await this.redis.get('key');
    console.log(val);
  }
}
