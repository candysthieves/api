import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function ApiAcceptYookassaWebhook() {
  return applyDecorators(
    ApiOperation({ summary: 'Accept a YooKassa payment notification' }),
    ApiOkResponse({
      description:
        'Notification persisted for processing, or unrelated event ignored',
    }),
  );
}
