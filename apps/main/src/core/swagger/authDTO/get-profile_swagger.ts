import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiGetProfile() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    // ApiCookieAuth('refreshToken'),
    ApiOperation({
      summary: 'Get current user profile',
    }),
    ApiOkResponse({
      description: 'Success',
      schema: {
        type: 'object',
        required: ['id', 'email', 'username', 'isEmailConfirmed'],
        properties: {
          id: {
            type: 'string',
          },
          email: {
            type: 'string',
          },
          username: {
            type: 'string',
          },
          firstName: {
            type: 'string',
            nullable: true,
          },
          lastName: {
            type: 'string',
            nullable: true,
          },
          isEmailConfirmed: {
            type: 'boolean',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
