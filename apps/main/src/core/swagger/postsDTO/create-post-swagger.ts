import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiCreatePost() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Create a post and try to save images',
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
            description: '1-8 images, up to 5 MB each.',
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
        'Post was created and its media was accepted for processing.',
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
      description: 'Missing or expired access token.',
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
    ApiServiceUnavailableResponse({
      description: 'Files service is unavailable.',
    }),
  );
}
