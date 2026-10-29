import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';

export function ApiSimulateYookassaWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Simulate a successful YooKassa webhook for local testing',
    }),
    ApiParam({ name: 'paymentId', description: 'Payment ID from YooKassa' }),
    ApiOkResponse({ description: 'Notification persisted for processing' }),
  );
}
