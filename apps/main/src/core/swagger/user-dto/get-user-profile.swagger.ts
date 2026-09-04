import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

export function ApiGetUserProfile() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get user profile',
      description:
        'Returns the profile of the specified user. The response also contains the number of publications and indicates whether the profile belongs to the current authenticated user.',
    }),

    ApiParam({
      name: 'username',
      description: 'Username of the user whose profile should be retrieved',
      type: String,
      example: 'john_doe',
    }),

    ApiOkResponse({
      description: 'User profile successfully retrieved',
      schema: {
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
          isOwner: false,
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
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
