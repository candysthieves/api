import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ObjectResult } from '../object-result.js';

export function RpcValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,

    exceptionFactory: (errors) => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
        errors: errors.map((err) => ({
          field: err.property,
          message: Object.values(err.constraints || {})[0],
        })),
      };

      return new RpcException(ObjectResult.failure(error));
    },
  });
}
