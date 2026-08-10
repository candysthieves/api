import { DomainExceptionCode, ErrorStatus } from './domain-exception-code.js';
import { DomainError } from './domain-error.js';

export class DomainException extends Error {
  constructor(
    public readonly code: DomainExceptionCode,
    public readonly errorCode: ErrorStatus,
    public readonly errors: DomainError[],
  ) {
    super(errors[0]?.message ?? 'Domain exception');
  }
}
