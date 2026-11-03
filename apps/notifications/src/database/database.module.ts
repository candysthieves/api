import {
  Global,
  Module,
  OnApplicationShutdown,
  Logger,
  Inject,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './database.constants.js';
import { NotificationsConfig } from '../notifications.config.js';

@Global()
@Module({
  providers: [
    NotificationsConfig,
    {
      provide: REDIS_CLIENT,
      inject: [NotificationsConfig],
      useFactory: (config: NotificationsConfig) => {
        const logger = new Logger('Redis');
        const client = new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          lazyConnect: false,
        });

        client.on('connect', () => {
          logger.log(
            `Redis connected on ${config.redisHost}:${config.redisPort}`,
          );
        });

        client.on('error', (err) => {
          logger.error('Redis connection error', err);
        });

        return client;
      },
    },
  ],
  exports: [NotificationsConfig, REDIS_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
