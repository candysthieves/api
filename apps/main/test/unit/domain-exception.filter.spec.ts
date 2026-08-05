import { ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../../src/core/exceptions/domain-exception.js';
import { DomainExceptionCode } from '../../src/core/exceptions/domain-exception-code.js';
import { DomainExceptionFilter } from '../../src/core/exceptions/domain-exception.filter.js';

const createHost = (response: Pick<Response, 'status'>): ArgumentsHost =>
  ({
    switchToHttp: () => ({ getResponse: () => response }),
  }) as ArgumentsHost;

describe('DomainExceptionFilter', () => {
  const catchException = (exception: DomainException) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    new DomainExceptionFilter().catch(exception, createHost({ status }));

    return { status, json };
  };

  it.each([
    [DomainExceptionCode.BadRequest, 400],
    [DomainExceptionCode.Unauthorized, 401],
    [DomainExceptionCode.Forbidden, 403],
    [DomainExceptionCode.NotFound, 404],
  ])(
    'preserves DomainException %i errors and status %i',
    (code, statusCode) => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const { status, json } = catchException(
        new DomainException(code, errors),
      );

      expect(status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith({ errorsMessages: errors });
    },
  );
});
