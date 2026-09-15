import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiGetPostById() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get post by ID',
      description:
        'Returns a post by its ID with an isOwner flag indicating whether the current authenticated user is the owner.',
    }),

    ApiParam({
      name: 'postId',
      type: String,
      description: 'ID of the post to retrieve.',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),

    ApiOkResponse({
      description:
        'Post successfully retrieved. Images preserve upload order and contain null for slots without a ready image. Preview is null until the first image is ready.',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          description: 'My first post',
          images: [
            {
              fileId: '550e8400-e29b-41d4-a716-446655440002',
              url: 'https://example.com/image.webp',
              width: 1920,
              height: 1080,
            },
          ],
          preview: {
            fileId: '550e8400-e29b-41d4-a716-446655440002',
            url: 'https://example.com/preview.webp',
            width: 400,
            height: 225,
          },
          createdAt: '2026-09-03T10:30:00.000Z',
          author: {
            id: '550e8400-e29b-41d4-a716-446655440003',
            username: 'john_doe',
          },
          isOwner: true,
        },
      },
    }),

    ApiBadRequestResponse({
      description: 'Validation error (postId must be a valid UUID).',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.VALIDATION_ERROR },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'postId' },
                message: {
                  type: 'string',
                  example: 'Validation failed (uuid is expected)',
                },
              },
            },
          },
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token has expired or session not found.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            example: ErrorStatus.ACCESS_TOKEN_EXPIRED,
            description:
              'Error status code (74 for expired, 80 for session not found)',
          },
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

    ApiNotFoundResponse({
      description: 'Post was not found or is scheduled for deletion.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.POST_NOT_FOUND },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'postId' },
                message: { type: 'string', example: 'Post not found' },
              },
            },
          },
        },
      },
    }),
  );
}
