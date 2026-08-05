import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from './domain-exception.js';
import { DomainExceptionCode } from './domain-exception-code.js';

//TODO попросить Влада объяснить за exception errors

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse<Response>();

    response.status(this.getDomainStatus(exception.code)).json({
      errorsMessages: exception.errors,
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
}
