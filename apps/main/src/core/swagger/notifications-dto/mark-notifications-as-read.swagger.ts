import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiMarkNotificationsAsRead() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Mark notifications as read',
      description:
        'Marks the specified notifications as read for the authenticated user. Only notifications belonging to the user are updated. Already read notifications are preserved.',
    }),
    ApiNoContentResponse({
      description: 'Notifications successfully marked as read',
    }),
    ApiBadRequestResponse({
      description: 'Invalid body parameters (ids must be a non-empty array of UUIDs).',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid or expired.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Notifications microservice is temporarily unavailable.',
    }),
  );
}
