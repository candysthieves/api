import {
  ConnectedSocket,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { QueryBus } from '@nestjs/cqrs';
import { Logger, UseFilters } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Namespace } from 'socket.io';
import type { IncomingMessage } from 'node:http';
import type { NotificationsCountContract } from '@libs/contracts';
import { ALLOWED_ORIGINS } from '../../../setup/allowed-origins.js';
import { GetNotificationsCountQuery } from '../application/query-handler/get-notifications-count.query-handler.js';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { NotificationsWsExceptionFilter } from './filters/notifications-ws-exception.filter.js';
import { NotificationsTcpService } from '../application/notifications-tcp.service.js';
import type { DeliverNotificationContract } from '@libs/contracts';
import type {
  AuthenticatedSocket,
  CountResponse,
  SocketConnectionError,
} from './types/notifications-socket.type.js';

// Обслуживает соединения уведомлений в /notifications: проверяет пользователя,
// регистрирует соединения через микросервис notifications и отправляет уведомления клиентам.
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: ALLOWED_ORIGINS },
  maxHttpBufferSize: 4096,
  allowRequest: (
    request: IncomingMessage,
    callback: (error: string | null, success: boolean) => void,
  ) => {
    const origin = request.headers.origin;
    const isAllowed = origin === undefined || ALLOWED_ORIGINS.includes(origin);

    callback(null, isAllowed);
  },
})
@UseFilters(NotificationsWsExceptionFilter)
export class NotificationsGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection, OnGatewayDisconnect
{
  private server: Namespace;
  private readonly socketIdsByUser = new Map<string, string>();
  private readonly connectionUpdates = new Map<string, Promise<void>>();
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly queryBus: QueryBus,
    private readonly notificationsTcpService: NotificationsTcpService,
  ) {}

  // Сохраняет namespace и проверяет access token перед допуском каждого соединения.
  afterInit(server: Namespace): void {
    this.server = server;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Middleware completes via next(); async errors are caught below.
    server.use(async (socket, next) => {
      try {
        const token: unknown = socket.handshake.auth.token;
        const user = await this.jwtAdapter.verifyAccessToken(token as string);

        socket.data = { user };
        next();
      } catch (error) {
        const connectionError: SocketConnectionError = new Error(
          'Unauthorized',
        );
        connectionError.data =
          NotificationsWsExceptionFilter.toSocketError(error);
        next(connectionError);
      }
    });
  }

  // Новое подключение заменяет и отключает предыдущий сокет пользователя.
  // При ошибке регистрации в notifications новое соединение отключается.
  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = String(socket.data.user.userId);
    const previousId = this.socketIdsByUser.get(userId);
    this.socketIdsByUser.set(userId, socket.id);
    if (previousId && previousId !== socket.id) {
      this.server.sockets.get(previousId)?.disconnect(true);
    }
    try {
      await this.cacheConnection(socket);
    } catch {
      this.logger.error('Could not cache notification connection');
      socket.disconnect(true);
    }
  }

  // Просит notifications удалить сокет; при ошибке запись истечёт по сроку активности.
  async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
    const userId = String(socket.data.user.userId);
    if (this.socketIdsByUser.get(userId) !== socket.id) return;
    this.socketIdsByUser.delete(userId);
    try {
      await this.updateConnection(userId, () =>
        this.notificationsTcpService.removeSession(userId, socket.id),
      );
    } catch {
      this.logger.error(
        'Could not remove notification connection; it will expire',
      );
    }
  }

  // Каждые 30 секунд продлевает записи активных соединений через notifications.
  @Cron('*/30 * * * * *', { waitForCompletion: true })
  async refreshConnections(): Promise<void> {
    if (!this.server) return;
    await Promise.all(
      [...this.server.sockets.values()].map(async (socket) => {
        try {
          await this.cacheConnection(socket as AuthenticatedSocket);
        } catch {
          this.logger.error('Could not refresh notification connection');
        }
      }),
    );
  }

  // Сохраняет соединение и удаляет запись, если сокет отключился во время сохранения.
  private async cacheConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = String(socket.data.user.userId);
    await this.updateConnection(userId, async () => {
      if (!socket.connected || this.socketIdsByUser.get(userId) !== socket.id)
        return;
      await this.notificationsTcpService.saveSession(userId, socket.id);
      if (!socket.connected)
        await this.notificationsTcpService.removeSession(userId, socket.id);
    });
  }

  // Сохраняет порядок регистрации, продления и удаления для одного пользователя в main.
  // Это не даёт завершению старой регистрации перезаписать новую при быстром подключении.
  private updateConnection(
    userId: string,
    update: () => Promise<void>,
  ): Promise<void> {
    const previous = this.connectionUpdates.get(userId) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(update);
    this.connectionUpdates.set(userId, pending);
    return pending.finally(() => {
      if (this.connectionUpdates.get(userId) === pending)
        this.connectionUpdates.delete(userId);
    });
  }

  // Отправляет уведомление текущему сокету пользователя без ожидания подтверждения клиента.
  deliver({
    userId,
    socketId,
    notification,
  }: DeliverNotificationContract): void {
    const socket = this.server?.sockets.get(socketId) as
      AuthenticatedSocket | undefined;
    if (
      socket?.connected &&
      String(socket.data.user.userId) === userId &&
      this.socketIdsByUser.get(userId) === socketId
    ) {
      socket.emit('notifications:new', { data: notification, error: null });
    }
  }

  // Возвращает число непрочитанных уведомлений текущего пользователя через QueryBus.
  @SubscribeMessage('notifications:unread-count')
  async getUnreadCount(
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<CountResponse> {
    const user = socket.data.user;
    const data = await this.queryBus.execute<
      GetNotificationsCountQuery,
      NotificationsCountContract
    >(new GetNotificationsCountQuery(String(user.userId)));
    return { data, error: null };
  }
}
