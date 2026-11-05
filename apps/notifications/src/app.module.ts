import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RabbitMqModule } from './core/rabbitmq/rabbitmq.module.js';

@Module({
  imports: [configModule, DatabaseModule, NotificationsModule, RabbitMqModule],
})
export class AppModule {}
