import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentSubscriptionViewType } from '../../../modules/payments/api/view-types/current-subscription-view.type.js';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiGetCurrentSubscription() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Get the current subscription dates',
    }),
    ApiOkResponse({
      description:
        'Current subscription dates, or null fields when the user has no current subscription.',
      type: CurrentSubscriptionViewType,
    }),
    ApiResponse({
      status: 503,
      description: `Payment service unavailable (error code ${ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED}).`,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is invalid or expired.',
    }),
  );
}
