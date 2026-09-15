import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiGetDeletedPostById() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get soft-deleted post by ID',
      description:
        'Returns a soft-deleted post by its ID. Only the post owner can access their deleted post.',
    }),

    ApiParam({
      name: 'postId',
      type: String,
      description: 'ID of the deleted post to retrieve.',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),

    ApiOkResponse({
      description: 'Deleted post successfully retrieved.',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          description: 'My soft-deleted post',
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
          willBeDeleted: '2026-09-03T11:30:00.000Z',
          author: {
            id: '550e8400-e29b-41d4-a716-446655440003',
            username: 'john_doe',
            avatarUrl: {
              fileId: '550e8400-e29b-41d4-a716-446655440001',
              url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
              width: 8000,
              height: 8000,
            },
            avatarPreviewUrl: {
              fileId: '550e8400-e29b-41d4-a716-446655440002',
              url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
              width: 8000,
              height: 8000,
            },
          },
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
            description: 'Error status code (74 for expired, 80 for session not found)',
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

    ApiForbiddenResponse({
      description: 'The deleted post belongs to another user.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.POST_ACCESS_FORBIDDEN },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'postId' },
                message: {
                  type: 'string',
                  example: 'You do not have permission to view this deleted post',
                },
              },
            },
          },
        },
      },
    }),

    ApiNotFoundResponse({
      description: 'Deleted post was not found.',
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
