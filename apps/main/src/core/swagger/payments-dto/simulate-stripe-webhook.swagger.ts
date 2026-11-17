import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';

export function ApiSimulateStripeWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Simulate a successful Stripe webhook for local testing',
    }),
    ApiParam({
      name: 'sessionId',
      description: 'Stripe checkout session ID (e.g. cs_test_...)',
    }),
    ApiOkResponse({ description: 'Notification persisted for processing' }),
  );
}
