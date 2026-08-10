import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';

export function ApiRegistrationNewUser() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Registration in system. Email with confirmation code will be send to passed email address',
    }),
    ApiCreatedResponse({ description: 'User registered successfully.' }),
    ApiBadRequestResponse({
      description:
        'Validation failed, passwords do not match, or email/username is already in use.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: 53 },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'password' },
                message: { type: 'string', example: 'password do not match' },
              },
            },
          },
        },
      },
    }),
  );
}
