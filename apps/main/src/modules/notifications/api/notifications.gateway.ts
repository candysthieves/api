import {
  ConnectedSocket,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { QueryBus } from '@nestjs/cqrs';
import { UseFilters } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import type { IncomingMessage } from 'node:http';
import type { NotificationsCountContract } from '@libs/contracts';
import { ALLOWED_ORIGINS } from '../../../setup/allowed-origins.js';
import { GetNotificationsCountQuery } from '../application/query-handler/get-notifications-count.query-handler.js';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { NotificationsWsExceptionFilter } from './filters/notifications-ws-exception.filter.js';
import type {
  AuthenticatedSocket,
  CountResponse,
  SocketConnectionError,
} from './types/notifications-socket.type.js';

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
export class NotificationsGateway implements OnGatewayInit<Namespace> {
  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly queryBus: QueryBus,
  ) {}

  afterInit(server: Namespace): void {
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
