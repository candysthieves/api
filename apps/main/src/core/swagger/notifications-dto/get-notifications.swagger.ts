import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaginatedNotificationsViewType } from '../../../modules/notifications/api/view-types/paginated-notifications-view.type.js';

export function ApiGetNotifications() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Get notifications for current user with infinite scroll',
      description:
        'Returns notifications for the authenticated user within the last 30 days. Sorted in descending order (newest first). Supports cursor-based pagination for infinite scroll: client passes the `createdAt` timestamp of the last loaded item as `cursor` to retrieve the next chunk. When `hasMore` is false or `nextCursor` is null, all notifications within the 30-day window have been retrieved.',
    }),
    ApiOkResponse({
      description: 'Paginated list of user notifications',
      type: PaginatedNotificationsViewType,
    }),
    ApiBadRequestResponse({
      description:
        'Invalid query parameters (pageSize must be between 1 and 50).',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid or expired.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Notifications microservice is temporarily unavailable.',
    }),
  );
}
