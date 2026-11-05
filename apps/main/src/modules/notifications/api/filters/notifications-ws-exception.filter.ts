import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { DomainException } from '../../../../core/exceptions/domain-exception.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import type {
  SocketError,
  SocketErrorAcknowledgement,
} from '../types/notifications-socket.type.js';

@Catch()
export class NotificationsWsExceptionFilter implements ExceptionFilter {
  static toSocketError(error: unknown): SocketError {
    if (error instanceof DomainException) {
      return { code: error.errorCode, errorsMessages: error.errors };
    }
    return {
      code: ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE,
      errorsMessages: [
        {
          field: 'notifications',
          message: 'Notifications service is temporarily unavailable',
        },
      ],
    };
  }

  catch(error: unknown, host: ArgumentsHost): void {
    // Приводим ошибку к формату ответа.
    const socketError = NotificationsWsExceptionFilter.toSocketError(error);
    // Получаем callback ответа из третьего аргумента.
    const acknowledge = host.getArgByIndex<
      SocketErrorAcknowledgement | undefined
    >(2);

    // Проверяем, передал ли клиент callback.
    if (typeof acknowledge === 'function') {
      // Отвечаем на запрос ошибкой.
      acknowledge({ data: null, error: socketError });
      // Завершаем обработку, чтобы не отправить ошибку дважды.
      return;
    }

    // Получаем соединение клиента.
    const socket = host.switchToWs().getClient<Socket>();
    // Без callback отправляем ошибку отдельным событием.
    socket.emit('exception', socketError);
  }
}
