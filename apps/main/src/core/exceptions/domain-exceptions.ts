import { DomainException } from './domain-exception.js';
import { DomainExceptionCode, ErrorStatus } from './domain-exception-code.js';
import { DomainError } from './domain-error.js';

export class DomainExceptions {
  static badRequest(code: ErrorStatus, field: string, message: string): never {
    throw new DomainException(DomainExceptionCode.BadRequest, code, [
      { field, message },
    ]);
  }

  static validation(errors: DomainError[]): never {
    throw new DomainException(
      DomainExceptionCode.ValidationError,
      ErrorStatus.VALIDATION_ERROR,
      errors,
    );
  }

  static notFound(
    code: ErrorStatus,
    field: string,
    message = 'Not found',
  ): never {
    throw new DomainException(DomainExceptionCode.NotFound, code, [
      { field, message },
    ]);
  }

  static forbidden(
    code: ErrorStatus,
    field: string = '',
    message = 'Forbidden',
  ): never {
    throw new DomainException(DomainExceptionCode.Forbidden, code, [
      { field, message },
    ]);
  }

  static unauthorized(
    code: ErrorStatus,
    field: string = '',
    message = 'Unauthorized',
  ): never {
    throw new DomainException(DomainExceptionCode.Unauthorized, code, [
      { field, message },
    ]);
  }

  static invalidToken(
    code: ErrorStatus,
    field: string = 'token',
    message = 'Invalid token',
  ): never {
    throw new DomainException(DomainExceptionCode.InvalidToken, code, [
      { field, message },
    ]);
  }
}
