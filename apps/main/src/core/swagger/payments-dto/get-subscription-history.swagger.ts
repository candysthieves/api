import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SubscriptionHistoryItemViewType } from '../../../modules/payments/api/view-types/subscription-history-item-view.type.js';

export function ApiGetSubscriptionHistory() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Get the current user subscription payment history',
      description:
        'Returns all subscription payments for the authenticated user, including pending, failed, and refunded payments.',
    }),
    ApiOkResponse({
      description: 'Subscription payment history',
      type: SubscriptionHistoryItemViewType,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is invalid or expired.',
    }),
  );
}
