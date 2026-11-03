import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [configModule, DatabaseModule, NotificationsModule],
})
export class AppModule {}
