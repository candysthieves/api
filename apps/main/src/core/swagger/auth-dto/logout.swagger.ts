import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiLogout() {
  return applyDecorators(
    ApiCookieAuth('refreshToken'),
    ApiOperation({
      summary:
        'In cookie client must send correct refreshToken that will be revoked',
    }),
    ApiNoContentResponse({
      description: 'No Content',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
    ApiResponse({ status: 498, description: 'Invalid refresh token' }),
  );
}
