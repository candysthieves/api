import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from './domain-exception.js';
import { DomainExceptionCode } from './domain-exception-code.js';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.code) {
      case DomainExceptionCode.BadRequest:
      case DomainExceptionCode.ValidationError:
      case DomainExceptionCode.EmailNotConfirmed:
      case DomainExceptionCode.ConfirmationCodeExpired:
      case DomainExceptionCode.PasswordRecoveryCodeExpired:
      case DomainExceptionCode.InvalidRecoveryCode:
        status = HttpStatus.BAD_REQUEST;
        break;

      case DomainExceptionCode.ServiceUnavailable:
        status = HttpStatus.SERVICE_UNAVAILABLE;
        break;

      case DomainExceptionCode.NotFound:
        status = HttpStatus.NOT_FOUND;
        break;

      case DomainExceptionCode.Forbidden:
        status = HttpStatus.FORBIDDEN;
        break;

      case DomainExceptionCode.Unauthorized:
        status = HttpStatus.UNAUTHORIZED;
        break;

      case DomainExceptionCode.InvalidToken:
        status = 498;
        break;
    }

    if (
      request.method === 'POST' &&
      (request.path === '/api/v1/auth/login' || request.path === '/api/v1/posts')
    ) {
      this.logger.warn(
        JSON.stringify({
          event: 'http_domain_exception',
          requestId:
            (request as Request & { requestId?: string }).requestId ?? null,
          method: request.method,
          path: request.path,
          statusCode: status,
          errorCode: exception.errorCode,
        }),
      );
    }

    response.status(status).json({
      code: exception.errorCode,
      errorsMessages: exception.errors,
    });
  }
}
