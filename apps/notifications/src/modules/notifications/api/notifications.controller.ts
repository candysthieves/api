import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateNotificationContract } from '@libs/contracts';
import { CreateNotificationCommand } from '../application/use-cases/create-notification.usecase.js';
import { GetNotificationsCountQuery } from '../application/query-handler/get-notifications-count.query-handler.js';
import { NotificationsCountViewType } from './view-types/notifications-count-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @MessagePattern({ cmd: 'create-notification' })
  async createNotification(
    @Payload() dto: CreateNotificationContract,
  ): Promise<void> {
    await this.commandBus.execute<CreateNotificationCommand, void>(
      new CreateNotificationCommand(dto),
    );
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
}

