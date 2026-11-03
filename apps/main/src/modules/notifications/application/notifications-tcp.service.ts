import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export const NOTIFICATIONS_TCP_SERVICE = 'NOTIFICATIONS_TCP_SERVICE';

@Injectable()
export class NotificationsTcpService {
  constructor(
    @Inject(NOTIFICATIONS_TCP_SERVICE)
    private readonly notificationsClient: ClientProxy,
  ) {}
}
