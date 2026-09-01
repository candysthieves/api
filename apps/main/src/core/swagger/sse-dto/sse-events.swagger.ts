import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { SseEventEnum } from '../../sse/types/sse-event.type.js';

export function ApiSseEvents() {
  return applyDecorators(
    ApiOperation({
      summary: 'Subscribe to server-sent events',
      description:
        'Opens a persistent SSE connection and receives real-time events.',
    }),
    ApiResponse({
      status: 200,
      description: 'SSE connection established',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: Object.values(SseEventEnum),
            example: SseEventEnum.POST_CREATED,
          },
        },
      },
    }),
  );
}
