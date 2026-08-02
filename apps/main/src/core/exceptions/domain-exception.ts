import { DomainExceptionCode } from './domain-exception-code.js';
import { DomainError } from './domain-error.js';

export class DomainException extends Error {
  constructor(
    public readonly code: DomainExceptionCode,
    public readonly errors: DomainError[],
  ) {
    super(errors[0]?.message ?? 'Domain exception');
  }
}
