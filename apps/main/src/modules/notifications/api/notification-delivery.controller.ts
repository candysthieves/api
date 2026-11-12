import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  DELIVER_NOTIFICATION,
  type DeliverNotificationContract,
  type DeliverNotificationResult,
} from '@libs/contracts';
import { NotificationsGateway } from './notifications.gateway.js';

@Controller()
export class NotificationDeliveryController {
  constructor(private readonly gateway: NotificationsGateway) {}

  @MessagePattern({ cmd: DELIVER_NOTIFICATION })
  deliver(
    @Payload() payload: DeliverNotificationContract,
  ): DeliverNotificationResult {
    this.gateway.deliver(payload);
    return { success: true };
  }
}
