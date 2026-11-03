import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsController } from './api/notifications.controller.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository.js';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.usecase.js';
import { GetNotificationsCountQueryHandler } from './application/query-handler/get-notifications-count.query-handler.js';

@Module({
  imports: [CqrsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    CreateNotificationUseCase,
    GetNotificationsCountQueryHandler,
  ],
})
export class NotificationsModule {}
