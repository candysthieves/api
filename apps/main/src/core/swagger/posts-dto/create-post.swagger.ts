import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiCreatePost() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Create a post and process images asynchronously',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['description', 'files'],
        properties: {
          description: {
            type: 'string',
            description: 'Description of your post',
            example: 'Mom was washing the frame',
          },
          files: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: { type: 'string', format: 'binary' },
            description: '1-8 images, up to 5 MiB each.',
          },
          location: {
            type: 'string',
            format: 'json',
            description:
              'Optional JSON array: [{id:"string", address:"string"}].',
            example: '[{"id":"place-123","address":"Minsk, Belarus"}]',
          },
        },
      },
    }),

    ApiCreatedResponse({
      description:
        'Returns immediately after creating the post, without waiting for image publication or processing. Each image is processed once in the background. Any publication or image processing failure removes the entire post. Subscribe to post-created, post-media-updated and post-deleted; each event contains { postId }.',
      schema: {
        type: 'object',
        required: ['postId'],
        properties: { postId: { type: 'string', format: 'uuid' } },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or the uploaded media was rejected.',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token has expired.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.ACCESS_TOKEN_EXPIRED },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'token' },
                message: {
                  type: 'string',
                  example: 'Access token has expired',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 498,
      description: 'Access token is invalid.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.ACCESS_TOKEN_INVALID },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'token' },
                message: { type: 'string', example: 'Invalid access token' },
              },
            },
          },
        },
      },
    }),
  );
}
