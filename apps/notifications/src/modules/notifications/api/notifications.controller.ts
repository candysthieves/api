import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateNotificationContract } from '@libs/contracts';
import { CreateNotificationCommand } from '../application/use-cases/create-notification.usecase.js';
import { ObjectResult } from '../../../core/object-result.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @MessagePattern({ cmd: 'create-notification' })
  async createNotification(
    @Payload() dto: CreateNotificationContract,
  ): Promise<ObjectResult<unknown>> {
    const result = await this.commandBus.execute<
      CreateNotificationCommand,
      unknown
    >(new CreateNotificationCommand(dto));

    return ObjectResult.success(result);
  }
}
