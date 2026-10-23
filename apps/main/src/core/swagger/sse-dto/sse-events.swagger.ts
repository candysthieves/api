import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { SseEventEnum } from '../../sse/types/sse-event.type.js';

export function ApiSseEvents() {
  return applyDecorators(
    ApiOperation({
      summary: 'Subscribe to server-sent events',
      description:
        'Opens a persistent SSE connection and receives real-time events when posts are created and their media is processed.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Post events include postId. payment-status-updated includes paymentId, status, and occurredAt.',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              SseEventEnum.POST_CREATED,
              SseEventEnum.POST_MEDIA_UPDATED,
              SseEventEnum.POST_DELETED,
              SseEventEnum.PAYMENT_STATUS_UPDATED,
            ],
            example: SseEventEnum.POST_CREATED,
            description: 'Post, media, or payment status update.',
          },
          data: {
            type: 'object',
            properties: {
              postId: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              paymentId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['pending', 'succeeded', 'failed', 'refunded'],
              },
              occurredAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        required: ['type', 'data'],
      },
    }),
  );
}
