import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiCreateNotification() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Create a notification',
      description:
        'Creates a notification for the specified user and saves it into the notifications microservice.',
    }),
    ApiNoContentResponse({
      description: 'Notification successfully created',
    }),
    ApiBadRequestResponse({
      description: 'Invalid body parameters (title and message are required).',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid or expired.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Notifications microservice is temporarily unavailable.',
    }),
  );
}
