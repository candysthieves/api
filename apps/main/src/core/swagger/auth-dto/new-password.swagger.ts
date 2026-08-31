import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiNewPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm password recovery',
    }),
    ApiNoContentResponse({
      description: 'If code is valid and new password is accepted',
    }),
    ApiBadRequestResponse({
      description:
        'If the inputModel has incorrect value (for incorrect password length) or RecoveryCode is incorrect or expired',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            example: ErrorStatus.PASSWORDS_NOT_MATCH,
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'password' },
                message: {
                  type: 'string',
                  example: 'Password confirmation must match the new password',
                },
              },
            },
          },
        },
      },
    }),
  );
}
