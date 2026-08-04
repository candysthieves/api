import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from './domain-exception.js';
import { DomainExceptionCode } from './domain-exception-code.js';

//TODO попросить Влада объяснить за exception errors

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainException) {
      response.status(this.getDomainStatus(exception.code)).json({
        errorsMessages: exception.errors,
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        errorsMessages: this.getHttpExceptionErrors(exception),
      });
      return;
    }

    const httpStatus = this.getHttpErrorStatus(exception);
    if (httpStatus !== undefined) {
      response.status(httpStatus).json({
        errorsMessages: this.getHttpErrorErrors(exception),
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errorsMessages: [{ field: '', message: 'Internal server error' }],
    });
  }

  private getDomainStatus(code: DomainExceptionCode): HttpStatus {
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (code) {
      case DomainExceptionCode.BadRequest:
      case DomainExceptionCode.ValidationError:
      case DomainExceptionCode.EmailNotConfirmed:
      case DomainExceptionCode.ConfirmationCodeExpired:
      case DomainExceptionCode.PasswordRecoveryCodeExpired:
      case DomainExceptionCode.InvalidRecoveryCode:
        status = HttpStatus.BAD_REQUEST;
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
    }

    return status;
  }

  private getHttpExceptionErrors(exception: HttpException) {
    return this.getMessages(exception.getResponse());
  }

  private getHttpErrorStatus(exception: unknown): number | undefined {
    if (
      typeof exception !== 'object' ||
      exception === null ||
      !('status' in exception)
    ) {
      return undefined;
    }

    const { status } = exception as { status?: unknown };
    return typeof status === 'number' && status >= 400 && status < 600
      ? status
      : undefined;
  }

  private getHttpErrorErrors(exception: unknown) {
    return this.getMessages(exception as { message?: string | string[] });
  }

  private getMessages(
    exceptionResponse: string | { message?: string | string[] },
  ) {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse.message;
    const messages = Array.isArray(message) ? message : [message];

    return messages.map((item) => ({
      field: '',
      message: typeof item === 'string' ? item : String(item),
    }));
  }
}
