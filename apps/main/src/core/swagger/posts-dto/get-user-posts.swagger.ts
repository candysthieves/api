import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { UserViewerStatus } from '../../enums/user-viewer-status.enum.js';

export function ApiUserPosts() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get user posts',
      description:
        "Returns posts of a specific user with cursor-based pagination. Includes viewerStatus ('owner' | 'user' | 'friend') indicating the viewer relationship to the user.",
    }),

    ApiParam({
      name: 'userId',
      type: String,
      description: 'Id of the user whose posts are requested.',
      example: '550e8400-e29b-41d4-a716-446655440000',
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
      description:
        'User posts successfully retrieved. Images preserve upload order and contain null for slots without a ready image. Preview is null until the first image is ready. Author avatarPreviewUrl contains preview image or null if author has no avatar.',
      schema: {
        type: 'object',
        required: ['items', 'nextCursor', 'hasNextPage', 'viewerStatus'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: [
                'id',
                'description',
                'images',
                'preview',
                'createdAt',
                'willBeDeleted',
                'author',
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
                willBeDeleted: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  example: null,
                },
                author: {
                  type: 'object',
                  required: ['id', 'username', 'avatarPreviewUrl'],
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid',
                      example: '550e8400-e29b-41d4-a716-446655440000',
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
              },
            },
          },
          nextCursor: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-09-03T10:20:00.000Z',
          },
          hasNextPage: {
            type: 'boolean',
            example: true,
          },
          viewerStatus: {
            enum: Object.values(UserViewerStatus),
            example: UserViewerStatus.USER,
          },
        },
        example: {
          items: [
            {
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
              willBeDeleted: null,
              author: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                username: 'john_doe',
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
          hasNextPage: true,
          viewerStatus: UserViewerStatus.USER,
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
}
