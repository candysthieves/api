import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';

export function ApiGetMyDeletedPosts() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get soft-deleted posts of current user',
      description:
        'Returns soft-deleted posts of the currently authenticated user with cursor-based pagination and author info.',
    }),

    ApiQuery({
      name: 'cursor',
      required: false,
      type: String,
      description: 'Cursor for fetching the next page of posts.',
      example: '2026-09-03T10:30:00.000Z',
    }),

    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of posts to return.',
      example: 10,
      default: 10,
      minimum: 1,
      maximum: 20,
    }),

    ApiOkResponse({
      description: 'Soft-deleted posts successfully retrieved.',
      schema: {
        example: {
          items: [
            {
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
          ],
          nextCursor: '2026-09-03T10:20:00.000Z',
          hasNextPage: false,
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
  );
}
