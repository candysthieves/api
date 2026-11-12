import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import {
  CreateNotificationContract,
  GetNotificationsContract,
  MarkNotificationsAsReadContract,
  PaginatedNotificationsContract,
  NotificationsCountContract,
  SAVE_NOTIFICATION_SESSION,
  REMOVE_NOTIFICATION_SESSION,
  type NotificationSessionContract,
  type NotificationSessionResult,
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

  // Передаёт регистрацию и продление соединения в микросервис notifications.
  saveSession(userId: string, socketId: string): Promise<void> {
    return this.updateSession(SAVE_NOTIFICATION_SESSION, { userId, socketId });
  }

  // Передаёт удаление отключённого соединения в микросервис notifications.
  removeSession(userId: string, socketId: string): Promise<void> {
    return this.updateSession(REMOVE_NOTIFICATION_SESSION, {
      userId,
      socketId,
    });
  }

  private async updateSession(
    command:
      typeof SAVE_NOTIFICATION_SESSION | typeof REMOVE_NOTIFICATION_SESSION,
    payload: NotificationSessionContract,
  ): Promise<void> {
    const result = await lastValueFrom(
      this.notificationsClient
        .send<
          RpcResponse<NotificationSessionResult>,
          NotificationSessionContract
        >({ cmd: command }, payload)
        .pipe(timeout(10_000)),
    );
    if (result?.error || result?.data?.success !== true) {
      throw new Error('Notification session update failed');
    }
  }

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
