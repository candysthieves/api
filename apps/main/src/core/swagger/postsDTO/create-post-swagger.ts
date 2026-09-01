import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiCreatePost() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({ summary: 'Create a post with up to eight images' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['description', 'files'],
        properties: {
          description: {
            type: 'string',
            example: 'A walk through the city at sunset.',
          },
          files: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string', format: 'binary' },
            description: 'One to eight image files; each file is limited to 5 MB.',
          },
          location: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'address'],
              properties: {
                id: { type: 'string', example: 'place-123' },
                address: { type: 'string', example: 'Minsk, Belarus' },
              },
            },
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Post was created and its media was accepted for processing.',
      schema: {
        type: 'object',
        required: ['postId'],
        properties: { postId: { type: 'string', format: 'uuid' } },
      },
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed or the uploaded media was rejected.',
    }),
    ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' }),
    ApiServiceUnavailableResponse({ description: 'Files service is unavailable.' }),
  );
}
