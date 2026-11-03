import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { NotificationsConfig } from './notifications.config.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [configModule, NotificationsModule],
  providers: [NotificationsConfig],
  exports: [NotificationsConfig],
})
export class AppModule {}
