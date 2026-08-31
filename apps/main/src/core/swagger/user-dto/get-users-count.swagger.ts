import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiGetUsersCount() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the total number of users',
    }),
    ApiOkResponse({
      description: 'Success',
      schema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Total number of users',
            example: 1250,
          },
        },
        required: ['count'],
      },
    }),
  );
}
