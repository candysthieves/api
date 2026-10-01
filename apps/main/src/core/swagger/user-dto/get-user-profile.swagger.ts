import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserViewerStatus } from '../../enums/user-viewer-status.enum.js';

export function ApiGetUserProfile() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get user profile (Optional auth)',
      description:
        "**[Optional authorization]** Returns the profile of the specified user. Bearer accessToken is optional. If provided, viewerStatus ('owner' | 'user' | 'friend') reflects the relationship to the profile; otherwise, viewerStatus is 'user'. The response also contains the number of publications.",
    }),

    ApiParam({
      name: 'userId',
      description: 'ID of the user whose profile should be retrieved',
      type: String,
      example: 'f5a18989-10d9-4b0b-aac1-2df4430fa43c',
    }),

    ApiOkResponse({
      description:
        'User profile successfully retrieved. avatarUrl and avatarPreviewUrl contain image details or null if no avatar is set.',
      schema: {
        type: 'object',
        required: [
          'id',
          'username',
          'description',
          'avatarUrl',
          'avatarPreviewUrl',
          'followersCount',
          'followingCount',
          'publicationsCount',
          'viewerStatus',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'f5a18989-10d9-4b0b-aac1-2df4430fa43c',
          },
          username: {
            type: 'string',
            example: 'john_doe',
          },
          description: {
            type: 'string',
            example:
              'Превращаю макеты дизайнеров в живой код, воюю с центрированием div и делаю так, чтобы пользователям было красиво и удобно.',
          },
          avatarUrl: {
            nullable: true,
            oneOf: [
              {
                type: 'object',
                required: ['fileId', 'url', 'width', 'height'],
                properties: {
                  fileId: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440001',
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
          followersCount: { type: 'number', example: 0 },
          followingCount: { type: 'number', example: 0 },
          publicationsCount: { type: 'number', example: 12 },
          viewerStatus: {
            enum: Object.values(UserViewerStatus),
            example: UserViewerStatus.USER,
          },
        },
        example: {
          id: 'f5a18989-10d9-4b0b-aac1-2df4430fa43c',
          username: 'john_doe',
          description:
            'Превращаю макеты дизайнеров в живой код, воюю с центрированием div и делаю так, чтобы пользователям было красиво и удобно.',
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
          followersCount: 0,
          followingCount: 0,
          publicationsCount: 12,
          viewerStatus: UserViewerStatus.USER,
        },
      },
    }),

    ApiNotFoundResponse({
      description: 'User not found',
      schema: {
        example: {
          code: 33,
          errorsMessages: [
            {
              field: 'user',
              message: 'User not found',
            },
          ],
        },
      },
    }),
  );
}
