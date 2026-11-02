import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { SubscriptionHistoryViewType } from '../../../modules/payments/api/view-types/subscription-history-view.type.js';

export function ApiGetSubscriptionHistory() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Get the current user subscription payment history',
      description:
        'Returns payment attempts for the authenticated user with page-based pagination, newest first by creation date. Includes pending, succeeded, canceled and failed attempts. Page numbering starts at 1. Returns items, totalCount, page and pageSize. A page beyond the available history has empty items and preserves totalCount. Payment date and subscription end date are null for unpaid attempts. Subscription end date is calculated from the payment date and current tariff duration.',
    }),
    ApiOkResponse({
      description: 'Subscription payment history',
      type: SubscriptionHistoryViewType,
    }),
    ApiBadRequestResponse({ description: 'Invalid page or pageSize.' }),
    ApiUnauthorizedResponse({
      description: 'Access token is invalid or expired.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Subscription payment history could not be retrieved.',
    }),
  );
}
