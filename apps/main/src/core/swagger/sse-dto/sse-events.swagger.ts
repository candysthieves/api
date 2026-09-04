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
      description: 'SSE connection established. Emits events when a post is ready.',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [SseEventEnum.POST_CREATED],
            example: SseEventEnum.POST_CREATED,
            description: 'Event type (currently only post-created is emitted).',
          },
          data: {
            type: 'object',
            properties: {
              postId: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
            },
            required: ['postId'],
          },
        },
        required: ['type', 'data'],
      },
    }),
  );
}
