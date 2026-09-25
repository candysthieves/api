import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';
import { UserViewerStatus } from '../../enums/user-viewer-status.enum.js';

export function ApiGetPostById() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get post by ID (Optional auth)',
      description:
        "**[Optional authorization]** Returns a post by its ID. Bearer accessToken is optional. If provided, viewerStatus ('owner' | 'user' | 'friend') reflects the relationship to the post author; otherwise, viewerStatus is 'user'.",
    }),

    ApiParam({
      name: 'postId',
      type: String,
      description: 'ID of the post to retrieve.',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),

    ApiOkResponse({
      description:
        'Post successfully retrieved. Images preserve upload order and contain null for slots without a ready image. Preview is null until the first image is ready. Author avatarPreviewUrl contains preview image or null if author has no avatar.',
      schema: {
        type: 'object',
        required: [
          'id',
          'description',
          'images',
          'preview',
          'createdAt',
          'author',
          'viewerStatus',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440001',
          },
          description: {
            type: 'string',
            example: 'My first post',
          },
          images: {
            type: 'array',
            items: {
              nullable: true,
              oneOf: [
                {
                  type: 'object',
                  required: ['fileId', 'url', 'width', 'height'],
                  properties: {
                    fileId: {
                      type: 'string',
                      format: 'uuid',
                      example: '550e8400-e29b-41d4-a716-446655440002',
                    },
                    url: {
                      type: 'string',
                      example: 'https://example.com/image.webp',
                    },
                    width: { type: 'number', example: 1920 },
                    height: { type: 'number', example: 1080 },
                  },
                },
                { type: 'null' },
              ],
            },
          },
          preview: {
            nullable: true,
            oneOf: [
              {
                type: 'object',
                required: ['fileId', 'url', 'width', 'height'],
                properties: {
                  fileId: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440002',
                  },
                  url: {
                    type: 'string',
                    example: 'https://example.com/preview.webp',
                  },
                  width: { type: 'number', example: 400 },
                  height: { type: 'number', example: 225 },
                },
              },
              { type: 'null' },
            ],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-03T10:30:00.000Z',
          },
          author: {
            type: 'object',
            required: ['id', 'username', 'avatarPreviewUrl'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440003',
              },
              username: {
                type: 'string',
                example: 'john_doe',
              },
              avatarPreviewUrl: {
                nullable: true,
                oneOf: [
                  {
                    type: 'object',
                    required: ['fileId', 'url', 'width', 'height'],
                    properties: {
                      fileId: {
                        type: 'string',
                        format: 'uuid',
                        example: '550e8400-e29b-41d4-a716-446655440002',
                      },
                      url: {
                        type: 'string',
                        example:
                          'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
                      },
                      width: { type: 'number', example: 8000 },
                      height: { type: 'number', example: 8000 },
                    },
                  },
                  { type: 'null' },
                ],
              },
            },
          },
          viewerStatus: {
            enum: Object.values(UserViewerStatus),
            example: UserViewerStatus.OWNER,
          },
        },
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
            avatarPreviewUrl: {
              fileId: '550e8400-e29b-41d4-a716-446655440002',
              url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
              width: 8000,
              height: 8000,
            },
          },
          viewerStatus: UserViewerStatus.OWNER,
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
