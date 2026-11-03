import { Module } from '@nestjs/common';
import { NotificationsController } from './api/notifications.controller.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository.js';

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
