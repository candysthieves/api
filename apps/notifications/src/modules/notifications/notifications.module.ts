import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsController } from './api/notifications.controller.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository.js';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.usecase.js';
import { ReplacePaymentNotificationsUseCase } from './application/use-cases/replace-payment-notifications.usecase.js';
import { GetNotificationsCountQueryHandler } from './application/query-handler/get-notifications-count.query-handler.js';
import { GetNotificationsQueryHandler } from './application/query-handler/get-notifications.query-handler.js';
import { MarkNotificationsAsReadUseCase } from './application/use-cases/mark-notifications-as-read.usecase.js';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsConfig } from '../../notifications.config.js';
import { ScheduledNotificationsRepository } from './infrastructure/repositories/scheduled-notifications.repository.js';
import { NotificationSocketsRepository } from './infrastructure/repositories/notification-sockets.repository.js';
import { SaveNotificationSessionUseCase } from './application/use-cases/save-notification-session.usecase.js';
import { RemoveNotificationSessionUseCase } from './application/use-cases/remove-notification-session.usecase.js';
import { NotificationsScheduler } from './application/notifications.scheduler.js';
import {
  MAIN_NOTIFICATIONS_TCP_CLIENT,
  NotificationDeliveryService,
} from './application/notification-delivery.service.js';

@Module({
  imports: [
    CqrsModule,
    ClientsModule.registerAsync([
      {
        name: MAIN_NOTIFICATIONS_TCP_CLIENT,
        inject: [NotificationsConfig],
        useFactory: (config: NotificationsConfig) => ({
          transport: Transport.TCP,
          options: { host: config.mainTcpHost, port: config.mainTcpPort },
        }),
      },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationSocketsRepository,
    SaveNotificationSessionUseCase,
    RemoveNotificationSessionUseCase,
    NotificationsRepository,
    CreateNotificationUseCase,
    ReplacePaymentNotificationsUseCase,
    GetNotificationsCountQueryHandler,
    GetNotificationsQueryHandler,
    MarkNotificationsAsReadUseCase,
    ScheduledNotificationsRepository,
    NotificationsScheduler,
    NotificationDeliveryService,
  ],
  exports: [ScheduledNotificationsRepository],
})
export class NotificationsModule {}
