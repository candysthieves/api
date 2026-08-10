import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ summary: 'Try login user to the system' }),
    ApiOkResponse({
      description: 'Success',
      schema: {
        type: 'object',
        required: ['accessToken'],
        properties: {
          accessToken: {
            type: 'string',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: 50 },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'password' },
                message: {
                  type: 'string',
                  example:
                    'password must be shorter than or equal to 20 characters ',
                },
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
