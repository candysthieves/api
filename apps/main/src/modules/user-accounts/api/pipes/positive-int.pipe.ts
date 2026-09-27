import { Injectable, PipeTransform } from '@nestjs/common';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class PositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1)
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'userId',
        'User ID must be a positive integer',
      );
    return parsed;
  }
}
