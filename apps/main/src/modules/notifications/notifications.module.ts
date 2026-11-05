import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsController } from './api/notifications.controller.js';
import {
  NotificationsTcpService,
  NOTIFICATIONS_TCP_SERVICE,
} from './application/notifications-tcp.service.js';
import { GetNotificationsQueryHandler } from './application/query-handler/get-notifications.query-handler.js';
import { MarkNotificationsAsReadUseCase } from './application/use-cases/mark-notifications-as-read.usecase.js';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.usecase.js';
import { NotificationsGateway } from './api/notifications.gateway.js';
import { GetNotificationsCountQueryHandler } from './application/query-handler/get-notifications-count.query-handler.js';

const controllers = [NotificationsController];
const queryHandlers = [
  GetNotificationsQueryHandler,
  GetNotificationsCountQueryHandler,
];
const useCases = [MarkNotificationsAsReadUseCase, CreateNotificationUseCase];
const services = [NotificationsTcpService, NotificationsGateway];

@Module({
  imports: [
    CqrsModule,
    ClientsModule.registerAsync([
      {
        name: NOTIFICATIONS_TCP_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('NOTIFICATIONS_TCP_HOST'),
            port: config.getOrThrow<number>('NOTIFICATIONS_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  controllers: [...controllers],
  providers: [...services, ...queryHandlers, ...useCases],
  exports: [NotificationsTcpService],
})
export class NotificationsModule {}
