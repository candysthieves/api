import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiRefreshToken() {
  return applyDecorators(
    ApiCookieAuth('refreshToken'),
    ApiOperation({
      summary:
        'Generate new pair of access and refresh tokens (in cookie client must send correct refreshToken that will be revoked after refreshing)',
    }),
    ApiOkResponse({
      description:
        'Returns JWT accessToken in body and JWT refreshToken in cookie (http-only, secure)',
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
    ApiUnauthorizedResponse({
      description: 'Unauthorized ',
    }),
  );
}
