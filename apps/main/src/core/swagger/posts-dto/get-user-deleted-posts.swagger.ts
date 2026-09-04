import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiUserDeletedPosts() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get soft-deleted posts of user',
      description:
        'Returns posts scheduled for deletion of a specific user with cursor-based pagination. Only the post owner can access their deleted posts.',
    }),

    ApiParam({
      name: 'userId',
      type: String,
      description: 'Id of the user whose deleted posts are requested.',
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
      description: 'User deleted posts successfully retrieved.',
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
            },
          ],
          nextCursor: '2026-09-03T10:20:00.000Z',
          hasNextPage: true,
          isOwner: true,
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),

    ApiForbiddenResponse({
      description: 'You do not have permission to view deleted posts of this user.',
    }),

    ApiNotFoundResponse({
      description: 'User not found.',
    }),
  );
}
