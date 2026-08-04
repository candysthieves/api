import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../../src/core/exceptions/domain-exception.js';
import { DomainExceptionCode } from '../../src/core/exceptions/domain-exception-code.js';
import { DomainExceptionFilter } from '../../src/core/exceptions/domain-exception.filter.js';

const createHost = (response: Pick<Response, 'status'>): ArgumentsHost =>
  ({
    switchToHttp: () => ({ getResponse: () => response }),
  }) as ArgumentsHost;

describe('DomainExceptionFilter', () => {
  const catchException = (exception: unknown) => {
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

  it.each([
    [new BadRequestException('Malformed request'), 400, ['Malformed request']],
    [new UnauthorizedException(), 401, ['Unauthorized']],
    [
      new ForbiddenException(['First error', 'Second error']),
      403,
      ['First error', 'Second error'],
    ],
    [new NotFoundException(), 404, ['Not Found']],
  ])(
    'normalizes Nest HttpException responses',
    (exception, statusCode, messages) => {
      const { status, json } = catchException(exception);

      expect(status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith({
        errorsMessages: messages.map((message) => ({ field: '', message })),
      });
    },
  );

  it('normalizes an Express malformed JSON error while preserving its status', () => {
    const { status, json } = catchException(
      Object.assign(new SyntaxError('Unexpected token } in JSON'), {
        status: 400,
      }),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      errorsMessages: [{ field: '', message: 'Unexpected token } in JSON' }],
    });
  });

  it('returns a safe 500 for unexpected errors', () => {
    const error = new Error('database password leaked');
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { status, json } = catchException(error);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      errorsMessages: [{ field: '', message: 'Internal server error' }],
    });
    expect(logger).toHaveBeenCalledWith(error);
  });
});
