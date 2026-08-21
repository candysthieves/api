import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiTerminateSessionById() {
  return applyDecorators(
    ApiCookieAuth('refreshToken'),
    ApiOperation({ summary: 'Terminate a session by ID' }),
    ApiParam({
      name: 'sessionId',
      description: 'ID of the session to be terminated.',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      example: 'c69d8d58-af75-4092-8329-6596ae411cc9',
    }),
    ApiNoContentResponse({ description: 'No Content' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiResponse({ status: 498, description: 'Invalid refresh token' }),
    ApiForbiddenResponse({
      description: 'If try to delete the device of other user',
    }),
    ApiNotFoundResponse({ description: 'Not Found' }),
  );
}
