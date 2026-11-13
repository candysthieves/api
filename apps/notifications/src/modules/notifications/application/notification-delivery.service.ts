import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import {
  DELIVER_NOTIFICATION,
  type DeliverNotificationContract,
  type DeliverNotificationResult,
} from '@libs/contracts';
import { NotificationSocketsRepository } from '../infrastructure/repositories/notification-sockets.repository.js';
import type { NotificationModel } from '../../../database/models/notification.model.js';
import { NotificationsMapper } from '../api/mappers/notifications.mapper.js';

// DI-токен TCP-клиента для передачи уведомлений в микросервис main.
export const MAIN_NOTIFICATIONS_TCP_CLIENT = 'MAIN_NOTIFICATIONS_TCP_CLIENT';

// Находит активное соединение пользователя и передаёт уведомление в main.
@Injectable()
export class NotificationDeliveryService {
  // Получает репозиторий соединений notifications и TCP-клиент main.
  constructor(
    private readonly notificationSocketsRepository: NotificationSocketsRepository,
    @Inject(MAIN_NOTIFICATIONS_TCP_CLIENT) private readonly main: ClientProxy,
  ) {}

  // Находит сокет с неистёкшим сроком активности; без него завершает работу.
  // Ждёт ответ main до 10 секунд. Успех подтверждает обработку команды,
  // но не получение уведомления браузером; ошибки передаются вызывающему коду.
  async deliver(notification: NotificationModel): Promise<void> {
    const socketId = await this.notificationSocketsRepository.findSocketId(
      notification.userId,
    );
    if (!socketId) return;

    const userId = notification.userId;
    const item = NotificationsMapper.toView(notification);
    const result = await lastValueFrom(
      this.main
        .send<DeliverNotificationResult, DeliverNotificationContract>(
          { cmd: DELIVER_NOTIFICATION },
          { userId, socketId, notification: item },
        )
        .pipe(timeout(10_000)),
    );
    if (result?.success !== true)
      throw new Error('NOTIFICATION_DELIVERY_NOT_CONFIRMED');
  }
}
