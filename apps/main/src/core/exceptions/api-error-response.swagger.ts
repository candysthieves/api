import { ErrorStatus } from './domain-exception-code.js';

export const apiErrorResponseSchema = {
  type: 'object',
  required: ['code', 'errorsMessages'],
  properties: {
    code: { type: 'number', example: ErrorStatus.REFRESH_TOKEN_EXPIRED },
    errorsMessages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'message'],
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'Incorrect email' },
        },
      },
    },
  },
  example: {
    code: ErrorStatus.REFRESH_TOKEN_EXPIRED,
    errorsMessages: [
      {
        field: 'refreshToken',
        message: 'Refresh token is expired.',
      },
    ],
  },
};
