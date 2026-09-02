import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiUpdatePost() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({ summary: 'Update a post description by ID' }),
    ApiParam({
      name: 'postId',
      description: 'Post ID.',
      schema: { type: 'string', format: 'uuid' },
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['description'],
        properties: {
          description: { type: 'string', description: 'New post description' },
        },
      },
    }),
    ApiNoContentResponse({ description: 'Post description was updated.' }),
    ApiBadRequestResponse({
      description: 'Post ID must be a UUID and description must be a string.',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing, invalid, or expired access token.',
    }),
    ApiForbiddenResponse({ description: 'The post belongs to another user.' }),
    ApiNotFoundResponse({ description: 'Post was not found.' }),
  );
}
