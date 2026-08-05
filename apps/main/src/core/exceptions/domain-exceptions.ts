import { DomainException } from './domain-exception.js';
import { DomainExceptionCode } from './domain-exception-code.js';
import { DomainError } from './domain-error.js';

//TODO переделать на нормальные ошибки (спросить у Влада)

export class DomainExceptions {
  static badRequest(field: string, message: string): never {
    throw new DomainException(DomainExceptionCode.BadRequest, [
      { field, message },
    ]);
  }

  static validation(errors: DomainError[]): never {
    throw new DomainException(DomainExceptionCode.ValidationError, errors);
  }

  static notFound(field: string, message = 'Not found'): never {
    throw new DomainException(DomainExceptionCode.NotFound, [
      { field, message },
    ]);
  }

  static forbidden(field: string = '', message = 'Forbidden'): never {
    throw new DomainException(DomainExceptionCode.Forbidden, [
      { field, message },
    ]);
  }

  static unauthorized(field: string = '', message = 'Unauthorized'): never {
    throw new DomainException(DomainExceptionCode.Unauthorized, [
      { field, message },
    ]);
  }
}
