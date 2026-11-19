import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { QueryBus } from '@nestjs/cqrs';
import { Logger, UseFilters } from '@nestjs/common';
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
export class NotificationsGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection<AuthenticatedSocket>
{
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly queryBus: QueryBus,
  ) {}

  afterInit(server: Namespace): void {
    this.logger.log('WebSocket namespace initialized: /notifications');
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Middleware completes via next(); async errors are caught below.
    server.use(async (socket, next) => {
      try {
        const token: unknown = socket.handshake.auth.token;
        this.logger.log({
          message: 'WebSocket connection attempt',
          socketId: socket.id,
          namespace: socket.nsp.name,
          origin: socket.handshake.headers.origin,
          transport: socket.conn.transport.name,
          hasToken: typeof token === 'string' && token.length > 0,
        });
        const user = await this.jwtAdapter.verifyAccessToken(token as string);

        socket.data = { user };
        next();
      } catch (error) {
        const connectionError: SocketConnectionError = new Error(
          'Unauthorized',
        );
        connectionError.data =
          NotificationsWsExceptionFilter.toSocketError(error);
        this.logger.warn({
          message: 'WebSocket authentication rejected',
          socketId: socket.id,
          error: connectionError.data,
        });
        next(connectionError);
      }
    });
  }

  handleConnection(socket: AuthenticatedSocket): void {
    const context = { socketId: socket.id, userId: socket.data.user.userId };
    this.logger.log({ message: 'WebSocket connected', ...context });

    socket.onAny((event: string, ...args: unknown[]) => {
      this.logger.log({
        message: 'WebSocket incoming event',
        ...context,
        event,
        hasAcknowledgement: typeof args.at(-1) === 'function',
        // Log argument structure without exposing credentials in arbitrary payloads.
        arguments: args
          .filter((argument) => typeof argument !== 'function')
          .map((argument) => {
            if (argument === null) return { type: 'null' };
            if (Buffer.isBuffer(argument))
              return { type: 'buffer', length: argument.length };
            if (Array.isArray(argument))
              return { type: 'array', length: argument.length };
            if (typeof argument === 'object')
              return { type: 'object', keys: Object.keys(argument) };
            return { type: typeof argument };
          }),
      });
    });
    socket.on('disconnect', (reason) => {
      this.logger.log({
        message: 'WebSocket disconnected',
        ...context,
        reason,
      });
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
    this.logger.log({
      message: 'WebSocket unread count response',
      socketId: socket.id,
      userId: user.userId,
      event: 'notifications:unread-count',
      data,
    });
    return { data, error: null };
  }
}
