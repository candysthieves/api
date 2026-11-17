import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function ApiAcceptStripeWebhook() {
  return applyDecorators(
    ApiOperation({ summary: 'Accept a Stripe payment notification' }),
    ApiOkResponse({
      description:
        'Notification persisted for processing, or unrelated event ignored',
    }),
  );
}
