import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { SubscriptionHistoryItemViewType } from '../../../modules/payments/api/view-types/subscription-history-item-view.type.js';

export function ApiGetSubscriptionHistory() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Get the current user subscription payment history',
      description:
        'Returns all payment attempts for the authenticated user, newest first by creation date. Includes pending, succeeded, canceled and failed attempts. Returns an empty array when there are no payments. Payment date and subscription end date are null for unpaid attempts. Subscription end date is calculated from the payment date and current tariff duration.',
    }),
    ApiOkResponse({
      description: 'Subscription payment history',
      type: SubscriptionHistoryItemViewType,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is invalid or expired.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Subscription payment history could not be retrieved.',
    }),
  );
}
