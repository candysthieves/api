import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiDeletePost() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({ summary: 'Schedule a post for permanent deletion by ID' }),
    ApiParam({
      name: 'postId',
      description: 'Post ID.',
      schema: { type: 'string', format: 'uuid' },
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiNoContentResponse({
      description: 'Post was scheduled for permanent deletion.',
    }),
    ApiBadRequestResponse({ description: 'Post ID must be a UUID.' }),
    ApiUnauthorizedResponse({
      description: 'Missing, invalid, or expired access token.',
    }),
    ApiForbiddenResponse({ description: 'The post belongs to another user.' }),
    ApiNotFoundResponse({ description: 'Post was not found.' }),
  );
}
