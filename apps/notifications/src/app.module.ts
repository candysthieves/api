import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { configModule } from './config.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RabbitMqModule } from './core/rabbitmq/rabbitmq.module.js';
import { NotificationEventsModule } from './events/notification-events.module.js';

@Module({
  imports: [
    configModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    NotificationsModule,
    RabbitMqModule,
    NotificationEventsModule,
  ],
})
export class AppModule {}
