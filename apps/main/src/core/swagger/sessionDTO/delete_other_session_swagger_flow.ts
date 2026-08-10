import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiDeleteOtherSessionExceptCurrentOne() {
  return applyDecorators(
    ApiCookieAuth('refreshToken'),
    ApiOperation({
      summary: 'Delete all active sessions except the current one',
    }),
    ApiNoContentResponse({
      description: 'No Content',
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
