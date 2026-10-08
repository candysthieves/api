import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ObjectResult } from '../object-result.js';

// Создаёт pipe для проверки входящих RPC-запросов.
export function RpcRequestValidationPipe() {
  return new ValidationPipe({
    // Удаляет поля, которых нет в DTO.
    whitelist: true,
    // Преобразует входные данные в экземпляр DTO.
    transform: true,

    // Возвращает ошибки в общем формате ответа.
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
