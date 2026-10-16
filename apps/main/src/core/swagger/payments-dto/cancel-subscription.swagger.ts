import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiCancelCurrentSubscription() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Cancel the current subscription at the end of its paid period',
    }),
    ApiNoContentResponse({
      description:
        'Cancellation request saved; access remains until expiration.',
    }),
    ApiNotFoundResponse({
      description: `No active subscription was found (error code ${ErrorStatus.SUBSCRIPTION_NOT_FOUND}).`,
    }),
    ApiResponse({
      status: 503,
      description: `Payment service unavailable (error code ${ErrorStatus.SUBSCRIPTION_CANCELLATION_FAILED}).`,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is invalid or expired.',
    }),
  );
}
