import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { YookassaWebhookDto } from '../../../modules/payments/api/dto/yookassa-webhook.dto.js';

export function ApiYookassaWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Process a YooKassa payment notification',
      description:
        'Public callback configured in the YooKassa shop as https://api.lumosapp.net/payments/yookassa/webhook. The endpoint accepts the YooKassa notification format and verifies the actual payment status with YooKassa before updating local state.',
    }),
    ApiBody({
      required: true,
      description: 'YooKassa payment notification payload.',
      type: YookassaWebhookDto,
    }),
  );
}
