import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiRecoveryPasswordValidate() {
  return applyDecorators(
    ApiOperation({
      summary: 'Validate password recovery code',
    }),
    ApiQuery({
      name: 'recoveryCode',
      required: true,
      type: String,
      format: 'uuid',
      description: 'Recovery code from the password recovery email link',
    }),
    ApiNoContentResponse({
      description: 'Recovery code is valid',
    }),
    ApiBadRequestResponse({
      description:
        'Recovery code is missing, is not a UUID, does not exist, or has expired',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            enum: [
              ErrorStatus.VALIDATION_ERROR,
              ErrorStatus.RECOVERY_CODE_INVALID,
              ErrorStatus.RECOVERY_CODE_EXPIRED,
            ],
            description:
              'VALIDATION_ERROR for a missing or non-UUID code; RECOVERY_CODE_INVALID for an unknown code; RECOVERY_CODE_EXPIRED for an expired code',
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'recoveryCode' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    }),
  );
}
