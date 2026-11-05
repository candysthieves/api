import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import {
  CreateNotificationContract,
  GetNotificationsContract,
  MarkNotificationsAsReadContract,
  PaginatedNotificationsContract,
  NotificationsCountContract,
} from '@libs/contracts';

export type RpcResponse<T> = {
  data: T | null;
  error: {
    code?: string;
    errors?: { field: string; message: string }[];
  } | null;
};

export const NOTIFICATIONS_TCP_SERVICE = 'NOTIFICATIONS_TCP_SERVICE';

@Injectable()
export class NotificationsTcpService {
  constructor(
    @Inject(NOTIFICATIONS_TCP_SERVICE)
    private readonly notificationsClient: ClientProxy,
  ) {}

  async createNotification(payload: CreateNotificationContract): Promise<void> {
    const result = await lastValueFrom(
      this.notificationsClient
        .send<RpcResponse<{ success: boolean }>>(
          { cmd: 'create-notification' },
          payload,
        )
        .pipe(timeout(10_000)),
    );

    if (result?.error) {
      throw new Error(
        result.error.errors?.[0]?.message ?? 'Failed to create notification',
      );
    }
  }

  async getNotificationsCount(
    userId: string,
  ): Promise<RpcResponse<NotificationsCountContract>> {
    return lastValueFrom(
      this.notificationsClient
        .send<RpcResponse<NotificationsCountContract>>(
          { cmd: 'get-notifications-count' },
          { userId },
        )
        .pipe(timeout(10_000)),
    );
  }

  async getNotifications(
    payload: GetNotificationsContract,
  ): Promise<RpcResponse<PaginatedNotificationsContract>> {
    return lastValueFrom(
      this.notificationsClient
        .send<RpcResponse<PaginatedNotificationsContract>>(
          { cmd: 'get-notifications' },
          payload,
        )
        .pipe(timeout(10_000)),
    );
  }

  async markNotificationsAsRead(
    payload: MarkNotificationsAsReadContract,
  ): Promise<void> {
    const result = await lastValueFrom(
      this.notificationsClient
        .send<RpcResponse<{ success: boolean }>>(
          { cmd: 'mark-notifications-as-read' },
          payload,
        )
        .pipe(timeout(10_000)),
    );

    if (result?.error) {
      throw new Error(
        result.error.errors?.[0]?.message ??
          'Failed to mark notifications as read',
      );
    }
  }
}
