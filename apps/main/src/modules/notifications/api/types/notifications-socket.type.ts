import type { Socket } from 'socket.io';
import type { NotificationsCountContract } from '@libs/contracts';
import type { JwtAccessPayload } from '../../../../core/types/jwt-payload.type.js';
import type { DomainError } from '../../../../core/exceptions/domain-error.js';
import type { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export type SocketError = { code: ErrorStatus; errorsMessages: DomainError[] };

export type SocketConnectionError = Error & { data?: SocketError };

export type SocketErrorAcknowledgement = (response: {
  data: null;
  error: SocketError;
}) => void;

export type CountResponse =
  | { data: NotificationsCountContract; error: null }
  | { data: null; error: SocketError };

export type AuthenticatedSocket = Omit<Socket, 'data'> & {
  data: { user: JwtAccessPayload };
};
