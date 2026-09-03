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
    ApiBearerAuth(),

    ApiOperation({
      summary: 'Get user profile',
      description:
        'Returns the profile of the specified user. The response also contains the number of publications and indicates whether the profile belongs to the current authenticated user.',
    }),

    ApiParam({
      name: 'userId',
      description: 'ID of the user whose profile should be retrieved',
      type: String,
      format: 'uuid',
      example: 'f5a18989-10d9-4b0b-aac1-2df4430fa43c',
    }),

    ApiOkResponse({
      description: 'User profile successfully retrieved',
      schema: {
        example: {
          id: 'f5a18989-10d9-4b0b-aac1-2df4430fa43c',
          username: 'john_doe',
          description:
            'Превращаю макеты дизайнеров в живой код, воюю с центрированием div и делаю так, чтобы пользователям было красиво и удобно.',
          avatarUrl:
            'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/POST/f5a18989-10d9-4b0b-aac1-2df4430fa43c.webp',
          avatarPreviewUrl:
            'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/POST_PREVIEW/c381f4c9-a077-4e47-93b5-c434156087df.webp',
          followersCount: 0,
          followingCount: 0,
          publicationsCount: 12,
          isOwner: false,
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing or invalid',
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
