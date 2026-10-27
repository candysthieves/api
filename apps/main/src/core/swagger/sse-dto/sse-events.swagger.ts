import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { SseEventEnum } from '../../sse/types/sse-event.type.js';

export function ApiSseEvents() {
  return applyDecorators(
    ApiOperation({
      summary: 'Subscribe to server-sent events',
      description:
        'Opens a persistent SSE connection for post updates and payment results.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Post events contain postId. payment-processed contains userId as a string and paymentStatus: completed or canceled. Only completed activates Business before emission.',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              SseEventEnum.POST_CREATED,
              SseEventEnum.POST_MEDIA_UPDATED,
              SseEventEnum.POST_DELETED,
              SseEventEnum.PAYMENT_PROCESSED,
            ],
            example: SseEventEnum.POST_CREATED,
            description: 'Post or payment update.',
          },
          data: {
            oneOf: [
              {
                type: 'object',
                required: ['postId'],
                properties: { postId: { type: 'string', format: 'uuid' } },
              },
              {
                type: 'object',
                required: ['userId', 'paymentStatus'],
                properties: {
                  userId: { type: 'string', example: '42' },
                  paymentStatus: {
                    type: 'string',
                    enum: ['completed', 'canceled'],
                  },
                },
              },
            ],
          },
        },
        required: ['type', 'data'],
      },
    }),
  );
}
