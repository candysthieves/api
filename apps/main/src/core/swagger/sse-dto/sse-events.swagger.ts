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
        'post-created is emitted after creation, before image processing completes. post-media-updated reports a saved image. post-deleted reports removal of the entire post after an image publication or processing failure. All contain postId.',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              SseEventEnum.POST_CREATED,
              SseEventEnum.POST_MEDIA_UPDATED,
              SseEventEnum.POST_DELETED,
            ],
            example: SseEventEnum.POST_CREATED,
            description: 'Post creation or media processing update.',
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
