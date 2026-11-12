import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationContract,
  GetNotificationsContract,
  MarkNotificationsAsReadContract,
  SAVE_NOTIFICATION_SESSION,
  REMOVE_NOTIFICATION_SESSION,
  type NotificationSessionContract,
  type NotificationSessionResult,
} from '@libs/contracts';
import { CreateNotificationCommand } from '../application/use-cases/create-notification.usecase.js';
import { GetNotificationsCountQuery } from '../application/query-handler/get-notifications-count.query-handler.js';
import { GetNotificationsQuery } from '../application/query-handler/get-notifications.query-handler.js';
import { MarkNotificationsAsReadCommand } from '../application/use-cases/mark-notifications-as-read.usecase.js';
import { NotificationsCountViewType } from './view-types/notifications-count-view.type.js';
import { PaginatedNotificationsViewType } from './view-types/paginated-notifications-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';
import { SaveNotificationSessionCommand } from '../application/use-cases/save-notification-session.usecase.js';
import { RemoveNotificationSessionCommand } from '../application/use-cases/remove-notification-session.usecase.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @MessagePattern({ cmd: SAVE_NOTIFICATION_SESSION })
  async saveSession(
    @Payload() dto: NotificationSessionContract,
  ): Promise<ObjectResult<NotificationSessionResult>> {
    await this.commandBus.execute<SaveNotificationSessionCommand, void>(
      new SaveNotificationSessionCommand(dto),
    );
    return ObjectResult.success({ success: true });
  }

  @MessagePattern({ cmd: REMOVE_NOTIFICATION_SESSION })
  async removeSession(
    @Payload() dto: NotificationSessionContract,
  ): Promise<ObjectResult<NotificationSessionResult>> {
    await this.commandBus.execute<RemoveNotificationSessionCommand, void>(
      new RemoveNotificationSessionCommand(dto),
    );
    return ObjectResult.success({ success: true });
  }

  @MessagePattern({ cmd: 'create-notification' })
  async createNotification(
    @Payload() dto: CreateNotificationContract,
  ): Promise<ObjectResult<{ success: boolean }>> {
    await this.commandBus.execute<CreateNotificationCommand, void>(
      new CreateNotificationCommand(dto),
    );

    return ObjectResult.success({ success: true });
  }

  @MessagePattern({ cmd: 'get-notifications-count' })
  async getNotificationsCount(
    @Payload() payload: { userId: string },
  ): Promise<ObjectResult<NotificationsCountViewType>> {
    const result = await this.queryBus.execute<
      GetNotificationsCountQuery,
      NotificationsCountViewType
    >(new GetNotificationsCountQuery(payload.userId));

    return ObjectResult.success(result);
  }

  @MessagePattern({ cmd: 'mark-notifications-as-read' })
  async markNotificationsAsRead(
    @Payload() dto: MarkNotificationsAsReadContract,
  ): Promise<ObjectResult<{ success: boolean }>> {
    await this.commandBus.execute<MarkNotificationsAsReadCommand, void>(
      new MarkNotificationsAsReadCommand(dto),
    );

    return ObjectResult.success({ success: true });
  }

  @MessagePattern({ cmd: 'get-notifications' })
  async getNotifications(
    @Payload() dto: GetNotificationsContract,
  ): Promise<ObjectResult<PaginatedNotificationsViewType>> {
    const result = await this.queryBus.execute<
      GetNotificationsQuery,
      PaginatedNotificationsViewType
    >(new GetNotificationsQuery(dto));

    return ObjectResult.success(result);
  }
}
