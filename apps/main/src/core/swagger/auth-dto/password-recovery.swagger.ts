import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiPasswordRecovery() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Password recovery via Email confirmation. Email should be sent with RecoveryCode inside',
    }),
    ApiNoContentResponse({
      description:
        'Password recovery code was generated and sent to the registered email.',
    }),
    ApiBadRequestResponse({
      description: 'If input data is invalid or the email is not registered.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            enum: [ErrorStatus.VALIDATION_ERROR, ErrorStatus.EMAIL_NOT_EXISTS],
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'email' },
                message: {
                  type: 'string',
                  example: "User with this email doesn't exist",
                },
              },
            },
          },
        },
      },
    }),
  );
}
